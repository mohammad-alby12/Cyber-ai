/* =========================================================
   CYBER AI — ui.js
   Rendering: sidebar list, model dropdown, settings panel, toasts, icons
   ========================================================= */

const UI = (() => {

  /* ---------- Logo mark (SVG, chrome) ---------- */

  const LOGO_SVG = `
    <svg viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18.5" stroke="url(#logo-ring)" stroke-width="1.6"/>
      <path d="M25.5 13.5a7.8 7.8 0 100 13" stroke="url(#logo-c)" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="20" cy="8.5" r="1.6" fill="url(#logo-dot)"/>
      <circle cx="20" cy="31.5" r="1.6" fill="url(#logo-dot)"/>
      <defs>
        <linearGradient id="logo-ring" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F5F5F5"/>
          <stop offset="1" stop-color="#6B6B6B"/>
        </linearGradient>
        <linearGradient id="logo-c" x1="18" y1="13" x2="30" y2="27" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F5F5F5"/>
          <stop offset="1" stop-color="#8A8A8A"/>
        </linearGradient>
        <linearGradient id="logo-dot" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#F5F5F5"/>
          <stop offset="1" stop-color="#8A8A8A"/>
        </linearGradient>
      </defs>
    </svg>`;

  function mountLogo(el) {
    if (el) el.innerHTML = LOGO_SVG;
  }

  /* ---------- Toasts ---------- */

  function toast(message, type = 'default', iconPath) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = iconPath || (type === 'success'
      ? '<path d="M20 6L9 17l-5-5"/>'
      : type === 'error'
        ? '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>');
    el.innerHTML = `<span class="icon"><svg viewBox="0 0 24 24">${icon}</svg></span><span>${escapeHTML(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 220);
    }, 2600);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Sidebar: conversation list ---------- */

  function timeGroup(ts) {
    const now = new Date();
    const d = new Date(ts);
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Previous 7 Days';
    return 'Older';
  }

  function renderConversationList(conversations, activeId, filterText) {
    const container = document.getElementById('conversation-list');
    if (!container) return;

    let list = conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="sidebar-empty">${filterText ? 'No conversations found' : 'No conversations yet'}</div>`;
      return;
    }

    const groups = {};
    const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];
    list.forEach(c => {
      const g = timeGroup(c.updatedAt);
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });

    let html = '';
    groupOrder.forEach(g => {
      if (!groups[g] || groups[g].length === 0) return;
      html += `<div class="chat-group-label">${g}</div>`;
      groups[g].forEach(c => {
        html += `
          <div class="chat-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}" role="button" tabindex="0">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-3.8-.9L3 20l1.05-3.9A8.5 8.5 0 1121 11.5z"/></svg></span>
            <span>${escapeHTML(c.title)}</span>
            <button class="chat-item-delete" data-delete-id="${c.id}" aria-label="Delete conversation" type="button">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg></span>
            </button>
          </div>`;
      });
    });
    container.innerHTML = html;
  }

  /* ---------- Model pill + dropdown ---------- */

  function updateModelPill(modelId, providerConnected) {
    const model = getModel(modelId);
    const provider = getProviderInfo(model.provider);
    const effectiveModel = typeof getEffectiveModel === 'function' ? getEffectiveModel(model.provider) : null;

    document.getElementById('model-pill-name').textContent = model.label;
    document.getElementById('model-pill-icon').innerHTML = `<svg viewBox="0 0 24 24">${model.icon}</svg>`;
    document.getElementById('model-pill-provider').textContent = provider
      ? `${provider.shortName}${effectiveModel ? ' · ' + effectiveModel : ''}`
      : 'No provider';

    const statusDot = document.getElementById('model-pill-status');
    statusDot.classList.toggle('offline', !providerConnected);
  }

  function renderModelDropdown(activeModelId) {
    const el = document.getElementById('model-dropdown');
    if (!el) return;

    let html = '';
    MODEL_ORDER.forEach(id => {
      const m = MODELS[id];
      const provider = getProviderInfo(m.provider);
      const storedProvider = Storage.getProvider(m.provider);
      const connected = !!storedProvider.apiKey;
      html += `
        <div class="model-option ${id === activeModelId ? 'active' : ''}" data-model-id="${id}" role="menuitem" tabindex="0">
          <span class="model-option-icon"><svg viewBox="0 0 24 24">${m.icon}</svg></span>
          <div class="model-option-body">
            <div class="model-option-name">${m.label}</div>
            <div class="model-option-role">${escapeHTML(m.role)}</div>
            <div class="model-option-provider">
              <span class="status-dot ${connected ? '' : 'offline'}"></span>
              ${provider ? provider.shortName : ''} · ${connected ? 'Online' : 'Not connected'}
            </div>
          </div>
        </div>`;
    });
    html += `<div class="model-dropdown-divider"></div>
      <div class="model-dropdown-foot">Select a persona to shape how Cyber AI responds.</div>`;
    el.innerHTML = html;
  }

  function toggleModelDropdown(open) {
    const el = document.getElementById('model-dropdown');
    const btn = document.getElementById('btn-model-pill');
    if (!el || !btn) return;
    const shouldOpen = open !== undefined ? open : !el.classList.contains('open');
    el.classList.toggle('open', shouldOpen);
    btn.setAttribute('aria-expanded', String(shouldOpen));
  }

  /* ---------- Sidebar (mobile) ---------- */

  function toggleSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;
    const shouldOpen = open !== undefined ? open : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', shouldOpen);
    backdrop.classList.toggle('open', shouldOpen);
  }

  /* ---------- Web search indicator ---------- */

  function setWebSearchIndicator(active) {
    document.getElementById('web-search-indicator').classList.toggle('active', active);
  }

  /* ---------- Settings panel ---------- */

  function openSettings(tab) {
    document.getElementById('settings-overlay').classList.add('open');
    if (tab) switchSettingsTab(tab);
  }

  function closeSettings() {
    document.getElementById('settings-overlay').classList.remove('open');
  }

  function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderSettingsBody(tab);
  }

  function renderSettingsBody(tab) {
    const body = document.getElementById('settings-body');
    if (!body) return;

    if (tab === 'providers') {
      body.innerHTML = renderProvidersTab();
      bindProviderCardEvents();
    } else if (tab === 'general') {
      body.innerHTML = renderGeneralTab();
      bindGeneralTabEvents();
    } else if (tab === 'about') {
      body.innerHTML = renderAboutTab();
    }
  }

  function renderModelField(id, info, stored) {
    const currentModel = (stored.model && stored.model.trim()) || info.defaultModel;
    const isCustom = !info.recommendedModels.some(m => m.id === currentModel);
    const options = info.recommendedModels.map(m =>
      `<option value="${escapeHTML(m.id)}" ${m.id === currentModel && !isCustom ? 'selected' : ''}>${escapeHTML(m.label)}</option>`
    ).join('');

    return `
      <label class="field-label" for="model-select-${id}">Model</label>
      <div class="model-select-row">
        <select id="model-select-${id}" data-model-select="${id}" class="model-select">
          ${options}
          <option value="__custom__" ${isCustom ? 'selected' : ''}>Custom model ID…</option>
        </select>
      </div>
      <div class="model-custom-row" data-model-custom-row="${id}" style="${isCustom ? '' : 'display:none;'}">
        <input type="text" id="model-custom-${id}" data-model-custom="${id}"
               placeholder="e.g. anthropic/claude-opus-4.1"
               value="${isCustom ? escapeHTML(currentModel) : ''}"
               autocomplete="off" spellcheck="false">
      </div>`;
  }

  function renderProvidersTab() {
    const providerIds = ['gemini', 'groq', 'openrouter', 'tavily'];
    let html = `
      <div class="settings-warning">
        <span class="icon"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L2.5 18a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg></span>
        <p>API keys are stored locally in this browser and sent directly to each provider. Frontend-only storage can be exposed on shared or compromised devices. For production use, route requests through a backend or proxy instead.</p>
      </div>`;

    providerIds.forEach(id => {
      const info = getProviderInfo(id);
      const stored = Storage.getProvider(id);
      const hasKey = !!stored.apiKey;
      const masked = hasKey ? '•'.repeat(Math.min(stored.apiKey.length, 20)) : '';

      html += `
        <div class="provider-card" data-provider="${id}">
          <div class="provider-card-head">
            <div class="provider-name-row">
              <span class="provider-icon"><svg viewBox="0 0 24 24">${info.icon}</svg></span>
              <span class="provider-name">${info.name}</span>
            </div>
            <span class="provider-status">
              <span class="status-dot ${stored.connected ? '' : 'offline'}"></span>
              ${stored.connected ? 'Connected' : (hasKey ? 'Not tested' : 'Not connected')}
            </span>
          </div>

          <label class="field-label" for="key-${id}">API Key</label>
          <div class="api-key-row">
            <div class="api-key-input-wrap">
              <input type="password" id="key-${id}" data-provider-input="${id}"
                     placeholder="${info.keyPlaceholder}"
                     value="${hasKey ? escapeHTML(stored.apiKey) : ''}"
                     autocomplete="off" spellcheck="false">
              <button class="icon-toggle-btn" data-toggle-visibility="${id}" type="button" aria-label="Show or hide API key">
                <span class="icon"><svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></span>
              </button>
            </div>
          </div>

          ${info.recommendedModels ? renderModelField(id, info, stored) : ''}

          <div class="provider-actions">
            <button class="btn-chrome-sm" data-test-provider="${id}" type="button">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M4 12h4l2-6 4 12 2-6h4"/></svg></span>
              Test Connection
            </button>
            <button class="btn-ghost-sm" data-save-provider="${id}" type="button">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg></span>
              Save
            </button>
            <button class="btn-ghost-sm" data-remove-provider="${id}" type="button">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg></span>
              Remove
            </button>
          </div>
          <div class="provider-testing" data-testing-status="${id}" style="display:none;"></div>
        </div>`;
    });

    return html;
  }

  function renderGeneralTab() {
    const prefs = Storage.getUIPrefs();
    return `
      <div class="settings-section-title">Behavior</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Web Search</div>
          <div class="settings-row-desc">Let Cyber AI use Tavily search results for up-to-date answers.</div>
        </div>
        <div class="switch ${prefs.webSearch ? 'on' : ''}" id="switch-web-search" role="switch" aria-checked="${prefs.webSearch}"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Extended Thinking</div>
          <div class="settings-row-desc">Show a brief reasoning status before Cyber AI responds.</div>
        </div>
        <div class="switch ${prefs.extendedThinking ? 'on' : ''}" id="switch-extended-thinking" role="switch" aria-checked="${prefs.extendedThinking}"></div>
      </div>

      <div class="settings-section-title">Data</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Clear all conversations</div>
          <div class="settings-row-desc">Removes every saved chat from this browser.</div>
        </div>
        <button class="btn-ghost-sm" id="btn-clear-conversations" type="button" style="flex:none; padding:7px 12px;">Clear</button>
      </div>`;
  }

  function renderAboutTab() {
    return `
      <div class="about-block">
        <span class="icon logo-mark">${LOGO_SVG}</span>
        <h3 class="chrome-text">CYBER AI</h3>
        <p>Intelligence Beyond The Interface.<br>A modular, frontend-only AI assistant with five personas and four provider integrations.</p>
        <div class="about-version">v1.0.0 · Frontend-only architecture</div>
      </div>`;
  }

  function getSelectedModelValue(id) {
    const select = document.getElementById(`model-select-${id}`);
    if (!select) return null; // provider has no model field (e.g. Tavily)
    if (select.value === '__custom__') {
      const customInput = document.getElementById(`model-custom-${id}`);
      return customInput ? customInput.value.trim() : '';
    }
    return select.value;
  }

  function bindProviderCardEvents() {
    document.querySelectorAll('[data-toggle-visibility]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleVisibility;
        const input = document.getElementById(`key-${id}`);
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    document.querySelectorAll('[data-model-select]').forEach(select => {
      select.addEventListener('change', () => {
        const id = select.dataset.modelSelect;
        const customRow = document.querySelector(`[data-model-custom-row="${id}"]`);
        if (select.value === '__custom__') {
          customRow.style.display = 'block';
          document.getElementById(`model-custom-${id}`)?.focus();
        } else {
          customRow.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('[data-save-provider]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.saveProvider;
        const input = document.getElementById(`key-${id}`);
        const value = input.value.trim();
        if (!value) {
          toast('Enter an API key before saving.', 'error');
          return;
        }
        Storage.setProviderKey(id, value);
        const modelValue = getSelectedModelValue(id);
        if (modelValue !== null) Storage.setProviderModel(id, modelValue);
        toast(`${getProviderInfo(id).name} key saved.`, 'success');
        renderSettingsBody('providers');
        if (typeof window.onProviderStateChanged === 'function') window.onProviderStateChanged();
      });
    });

    document.querySelectorAll('[data-remove-provider]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.removeProvider;
        Storage.removeProviderKey(id);
        toast(`${getProviderInfo(id).name} key removed.`, 'default');
        renderSettingsBody('providers');
        if (typeof window.onProviderStateChanged === 'function') window.onProviderStateChanged();
      });
    });

    document.querySelectorAll('[data-test-provider]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.testProvider;
        const input = document.getElementById(`key-${id}`);
        const apiKey = input.value.trim();
        const statusEl = document.querySelector(`[data-testing-status="${id}"]`);
        const modelValue = getSelectedModelValue(id);

        if (!apiKey) {
          toast('Enter an API key before testing.', 'error');
          return;
        }
        if (modelValue === '') {
          toast('Enter a custom model ID or pick one from the list.', 'error');
          return;
        }

        btn.disabled = true;
        statusEl.style.display = 'flex';
        statusEl.innerHTML = `<span class="thinking-dots"><span></span><span></span><span></span></span> Testing connection...`;

        try {
          await CyberAPI.testProvider(id, apiKey, modelValue);
          Storage.setProviderKey(id, apiKey);
          if (modelValue !== null) Storage.setProviderModel(id, modelValue);
          Storage.setProviderConnected(id, true);
          statusEl.innerHTML = '';
          statusEl.style.display = 'none';
          toast(`${getProviderInfo(id).name} connected.`, 'success');
          renderSettingsBody('providers');
          if (typeof window.onProviderStateChanged === 'function') window.onProviderStateChanged();
        } catch (e) {
          Storage.setProviderKey(id, apiKey);
          if (modelValue !== null) Storage.setProviderModel(id, modelValue);
          Storage.setProviderConnected(id, false);
          statusEl.style.display = 'none';
          toast(e.message || 'Unable to connect to provider.', 'error');
          renderSettingsBody('providers');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function bindGeneralTabEvents() {
    const webSwitch = document.getElementById('switch-web-search');
    if (webSwitch) {
      webSwitch.addEventListener('click', () => {
        const next = !webSwitch.classList.contains('on');
        Storage.setUIPref('webSearch', next);
        webSwitch.classList.toggle('on', next);
        webSwitch.setAttribute('aria-checked', String(next));
        if (typeof window.onWebSearchPrefChanged === 'function') window.onWebSearchPrefChanged(next);
      });
    }
    const thinkSwitch = document.getElementById('switch-extended-thinking');
    if (thinkSwitch) {
      thinkSwitch.addEventListener('click', () => {
        const next = !thinkSwitch.classList.contains('on');
        Storage.setUIPref('extendedThinking', next);
        thinkSwitch.classList.toggle('on', next);
        thinkSwitch.setAttribute('aria-checked', String(next));
        if (typeof window.onThinkingPrefChanged === 'function') window.onThinkingPrefChanged(next);
      });
    }
    const clearBtn = document.getElementById('btn-clear-conversations');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all conversations? This cannot be undone.')) {
          Storage.saveConversations([]);
          Storage.setActiveConvoId(null);
          toast('All conversations cleared.', 'default');
          if (typeof window.onConversationsCleared === 'function') window.onConversationsCleared();
        }
      });
    }
  }

  return {
    mountLogo,
    toast,
    escapeHTML,
    renderConversationList,
    updateModelPill,
    renderModelDropdown,
    toggleModelDropdown,
    toggleSidebar,
    setWebSearchIndicator,
    openSettings,
    closeSettings,
    switchSettingsTab,
    renderSettingsBody,
    LOGO_SVG
  };
})();
