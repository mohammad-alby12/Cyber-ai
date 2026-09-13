/* =========================================================
   CYBER AI — app.js
   Application state + event wiring
   ========================================================= */

(() => {
  const state = {
    conversations: [],
    activeConvoId: null,
    selectedModel: 'codex',
    webSearch: false,
    extendedThinking: false,
    isSending: false
  };

  /* ---------- Elements ---------- */
  const els = {};

  function cacheEls() {
    [
      'sidebar', 'sidebar-backdrop', 'btn-menu-toggle',
      'btn-new-chat', 'search-chats', 'conversation-list',
      'btn-open-models', 'btn-open-api', 'btn-open-settings', 'btn-open-about',
      'btn-model-pill', 'model-dropdown', 'web-search-indicator',
      'btn-topbar-settings', 'welcome-screen', 'welcome-prompt',
      'welcome-no-provider', 'btn-configure-provider', 'quick-actions',
      'chat-scroll', 'chat-inner', 'chip-web-search', 'chip-thinking',
      'chat-input', 'btn-send', 'btn-attach', 'file-input', 'attachment-tray',
      'input-region', 'dropzone-overlay',
      'settings-overlay', 'btn-close-settings', 'settings-panel-title',
      'logo-mark-sidebar', 'logo-mark-welcome', 'model-pill-icon',
      'lightbox-overlay', 'btn-lightbox-close', 'lightbox-img'
    ].forEach(id => els[id] = document.getElementById(id));
  }

  /* ---------- Init ---------- */

  function init() {
    cacheEls();
    UI.mountLogo(els['logo-mark-sidebar']);
    UI.mountLogo(els['logo-mark-welcome']);

    state.conversations = Storage.getConversations();
    state.activeConvoId = Storage.getActiveConvoId();
    state.selectedModel = Storage.getSelectedModel();
    const prefs = Storage.getUIPrefs();
    state.webSearch = prefs.webSearch;
    state.extendedThinking = prefs.extendedThinking;

    bindEvents();
    Preview.bindGlobalControls();
    refreshSidebar();
    refreshModelUI();
    refreshInputToggles();
    UI.setWebSearchIndicator(state.webSearch);

    const activeConvo = getActiveConvo();
    if (activeConvo) {
      renderConversation(activeConvo);
    } else {
      showWelcomeScreen();
    }

    checkProviderConfigured();

    // hooks for ui.js settings callbacks
    window.onProviderStateChanged = () => {
      refreshModelUI();
      checkProviderConfigured();
    };
    window.onWebSearchPrefChanged = (val) => {
      state.webSearch = val;
      els['chip-web-search'].classList.toggle('on', val);
      els['chip-web-search'].setAttribute('aria-pressed', String(val));
      UI.setWebSearchIndicator(val);
    };
    window.onThinkingPrefChanged = (val) => {
      state.extendedThinking = val;
      els['chip-thinking'].classList.toggle('on', val);
      els['chip-thinking'].setAttribute('aria-pressed', String(val));
    };
    window.onConversationsCleared = () => {
      state.conversations = [];
      state.activeConvoId = null;
      refreshSidebar();
      showWelcomeScreen();
    };
  }

  /* ---------- Conversation helpers ---------- */

  function getActiveConvo() {
    return state.conversations.find(c => c.id === state.activeConvoId) || null;
  }

  function createConversation(firstUserText) {
    const convo = {
      id: Chat.genId(),
      title: Chat.titleFromMessage(firstUserText),
      modelId: state.selectedModel,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.conversations.unshift(convo);
    state.activeConvoId = convo.id;
    Storage.setActiveConvoId(convo.id);
    Storage.upsertConversation(convo);
    return convo;
  }

  function persistConvo(convo) {
    convo.updatedAt = Date.now();
    Storage.upsertConversation(convo);
  }

  /* ---------- Rendering ---------- */

  function showWelcomeScreen() {
    els['welcome-screen'].style.display = 'flex';
    els['chat-scroll'].style.display = 'none';
  }

  function showChatScreen() {
    els['welcome-screen'].style.display = 'none';
    els['chat-scroll'].style.display = 'block';
  }

  function renderConversation(convo) {
    showChatScreen();
    els['chat-inner'].innerHTML = '';
    convo.messages.forEach(m => {
      if (m.role === 'user') {
        els['chat-inner'].appendChild(Chat.buildUserMessage(m.content, m.attachments));
      } else {
        els['chat-inner'].appendChild(Chat.buildAssistantMessage(m.modelId || convo.modelId, m.content, m.isError, m.errorType));
      }
    });
    Anim.scrollToBottom(els['chat-scroll'], false);
    bindMessageActionEvents();
  }

  function refreshSidebar(filterText) {
    UI.renderConversationList(state.conversations, state.activeConvoId, filterText);
    bindSidebarItemEvents();
  }

  function refreshModelUI() {
    const providerId = getModel(state.selectedModel).provider;
    const stored = Storage.getProvider(providerId);
    UI.updateModelPill(state.selectedModel, !!stored.apiKey);
    UI.renderModelDropdown(state.selectedModel);
    bindModelDropdownEvents();
  }

  function refreshInputToggles() {
    els['chip-web-search'].classList.toggle('on', state.webSearch);
    els['chip-web-search'].setAttribute('aria-pressed', String(state.webSearch));
    els['chip-thinking'].classList.toggle('on', state.extendedThinking);
    els['chip-thinking'].setAttribute('aria-pressed', String(state.extendedThinking));
  }

  function checkProviderConfigured() {
    const has = Storage.hasAnyProviderConfigured();
    els['welcome-no-provider'].style.display = has ? 'none' : 'flex';
    els['quick-actions'].style.display = has ? 'flex' : 'none';
  }

  /* ---------- Sending messages ---------- */

  async function sendCurrentInput() {
    const text = els['chat-input'].value.trim();
    const hasAttachments = Attachments.hasPending();
    if ((!text && !hasAttachments) || state.isSending) return;

    // Wait briefly if files are still being read
    if (Attachments.getPending().some(f => f.status === 'loading')) {
      UI.toast('Attachments are still loading…', 'default');
      return;
    }

    const providerId = getModel(state.selectedModel).provider;
    const providerConf = Storage.getProvider(providerId);
    const attachmentsMeta = Attachments.snapshotForMessage();

    let convo = getActiveConvo();
    if (!convo) {
      convo = createConversation(text || (attachmentsMeta[0]?.name ?? 'New conversation'));
      refreshSidebar();
    }

    convo.modelId = state.selectedModel;
    convo.messages.push({ role: 'user', content: text, attachments: attachmentsMeta });
    persistConvo(convo);

    showChatScreen();
    els['chat-inner'].appendChild(Chat.buildUserMessage(text, attachmentsMeta));
    Anim.scrollToBottom(els['chat-scroll']);

    els['chat-input'].value = '';
    Anim.autoGrowTextarea(els['chat-input']);
    Attachments.clearPending();
    refreshAttachmentTray();
    updateSendButtonState();

    await runAssistantTurn(convo, providerId, providerConf);
  }

  async function runAssistantTurn(convo, providerId, providerConf) {
    state.isSending = true;
    updateSendButtonState();

    let thinkingRow = null;
    if (state.extendedThinking) {
      thinkingRow = Chat.buildThinkingStatus('Analyzing...');
      els['chat-inner'].appendChild(thinkingRow);
      Anim.scrollToBottom(els['chat-scroll']);
      await sleep(500);
      const textEl = thinkingRow.querySelector('[data-thinking-text]');
      if (textEl) textEl.textContent = 'Reasoning...';
      await sleep(550);
      if (textEl) textEl.textContent = 'Preparing response...';
      await sleep(450);
    }

    if (thinkingRow) thinkingRow.remove();
    const typingRow = Chat.buildTypingIndicator(convo.modelId);
    els['chat-inner'].appendChild(typingRow);
    Anim.scrollToBottom(els['chat-scroll']);

    const model = getModel(convo.modelId);

    try {
      if (!providerConf.apiKey) {
        throw new CyberAPI.ProviderError('No AI provider configured for this persona. Add an API key in Settings.', 'no_provider');
      }

      let systemPrompt = model.systemPrompt;

      const hasImageAttachment = convo.messages.some(m => m.attachments && m.attachments.some(a => a.isImage));
      if (hasImageAttachment) {
        systemPrompt += '\n\nNote: the user may attach images. You cannot see image contents directly in this build — if an image is attached and relevant, ask the user to describe it or paste any text from it.';
      }

      // Optional web search augmentation via Tavily
      if (state.webSearch) {
        const tavilyConf = Storage.getProvider('tavily');
        if (tavilyConf.apiKey) {
          try {
            const lastUserMsg = [...convo.messages].reverse().find(m => m.role === 'user');
            const results = await CyberAPI.callTavilySearch(tavilyConf.apiKey, lastUserMsg.content);
            if (results && results.length) {
              const context = results.slice(0, 5).map((r, idx) => `[${idx + 1}] ${r.title}: ${r.content}`).join('\n');
              systemPrompt += `\n\nUse the following recent web search results if relevant to answer accurately:\n${context}`;
            }
          } catch (searchErr) {
            // Non-fatal: continue without web context
          }
        }
      }

      const apiMessages = convo.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: composeMessageContent(m) }));

      const replyText = await CyberAPI.sendMessage({
        providerId,
        apiKey: providerConf.apiKey,
        model: getEffectiveModel(providerId),
        messages: apiMessages,
        systemPrompt
      });

      typingRow.remove();
      convo.messages.push({ role: 'assistant', content: replyText, modelId: convo.modelId });
      persistConvo(convo);
      els['chat-inner'].appendChild(Chat.buildAssistantMessage(convo.modelId, replyText));
      Anim.scrollToBottom(els['chat-scroll']);
      bindMessageActionEvents();
      refreshSidebar();

    } catch (err) {
      typingRow.remove();
      const message = err instanceof CyberAPI.ProviderError ? err.message : 'Something went wrong. Please try again.';
      const errType = err instanceof CyberAPI.ProviderError ? err.type : 'unknown';
      convo.messages.push({ role: 'assistant', content: message, modelId: convo.modelId, isError: true, errorType: errType });
      persistConvo(convo);
      els['chat-inner'].appendChild(Chat.buildAssistantMessage(convo.modelId, message, true, errType));
      Anim.scrollToBottom(els['chat-scroll']);
      bindMessageActionEvents();
    } finally {
      state.isSending = false;
      updateSendButtonState();
    }
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  function composeMessageContent(m) {
    if (!m.attachments || m.attachments.length === 0) return m.content;
    let extra = '';
    m.attachments.forEach(a => {
      if (a.isImage) {
        extra += `\n\n[Attached image: ${a.name}]`;
      } else if (a.textContent) {
        const truncated = a.textContent.length > 6000 ? a.textContent.slice(0, 6000) + '\n…(truncated)' : a.textContent;
        extra += `\n\n[Attached file: ${a.name}]\n\`\`\`\n${truncated}\n\`\`\``;
      } else {
        extra += `\n\n[Attached file: ${a.name}]`;
      }
    });
    return (m.content || '').trim() + extra;
  }

  function updateSendButtonState() {
    const hasText = els['chat-input'].value.trim().length > 0;
    const hasAttachments = Attachments.hasPending();
    const canSend = hasText || hasAttachments;
    els['btn-send'].disabled = !canSend || state.isSending;
    els['btn-send'].classList.toggle('ready', canSend && !state.isSending);
    els['btn-send'].classList.toggle('sending', state.isSending);
  }

  function refreshAttachmentTray() {
    Attachments.renderTray(els['attachment-tray'], (id) => {
      Attachments.removeFile(id, refreshAttachmentTray);
    });
    updateSendButtonState();
  }

  /* ---------- Event bindings ---------- */

  function bindEvents() {
    els['btn-menu-toggle'].addEventListener('click', () => UI.toggleSidebar());
    els['sidebar-backdrop'].addEventListener('click', () => UI.toggleSidebar(false));

    els['btn-new-chat'].addEventListener('click', () => {
      state.activeConvoId = null;
      Storage.setActiveConvoId(null);
      showWelcomeScreen();
      refreshSidebar();
      UI.toggleSidebar(false);
      els['chat-input'].focus();
    });

    els['search-chats'].addEventListener('input', (e) => refreshSidebar(e.target.value));

    els['btn-open-models'].addEventListener('click', () => { UI.openSettings('providers'); UI.toggleSidebar(false); });
    els['btn-open-api'].addEventListener('click', () => { UI.openSettings('providers'); UI.toggleSidebar(false); });
    els['btn-open-settings'].addEventListener('click', () => { UI.openSettings('general'); UI.toggleSidebar(false); });
    els['btn-open-about'].addEventListener('click', () => { UI.openSettings('about'); UI.toggleSidebar(false); });
    els['btn-topbar-settings'].addEventListener('click', () => UI.openSettings('providers'));
    els['btn-configure-provider'].addEventListener('click', () => UI.openSettings('providers'));

    els['btn-close-settings'].addEventListener('click', () => UI.closeSettings());
    els['settings-overlay'].addEventListener('click', (e) => {
      if (e.target === els['settings-overlay']) UI.closeSettings();
    });

    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => UI.switchSettingsTab(tab.dataset.tab));
    });

    els['btn-model-pill'].addEventListener('click', (e) => {
      e.stopPropagation();
      UI.toggleModelDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!els['model-dropdown'].contains(e.target) && !els['btn-model-pill'].contains(e.target)) {
        UI.toggleModelDropdown(false);
      }
    });

    els['chip-web-search'].addEventListener('click', () => {
      state.webSearch = !state.webSearch;
      Storage.setUIPref('webSearch', state.webSearch);
      refreshInputToggles();
      UI.setWebSearchIndicator(state.webSearch);
      if (state.webSearch && !Storage.getProvider('tavily').apiKey) {
        UI.toast('Add a Tavily API key in Settings to enable web search.', 'default');
      }
    });

    els['chip-thinking'].addEventListener('click', () => {
      state.extendedThinking = !state.extendedThinking;
      Storage.setUIPref('extendedThinking', state.extendedThinking);
      refreshInputToggles();
    });

    els['btn-attach'].addEventListener('click', () => {
      els['file-input'].click();
    });

    els['file-input'].addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      await Attachments.addFiles(e.target.files, refreshAttachmentTray);
      els['file-input'].value = '';
    });

    // Drag and drop onto the input region
    let dragCounter = 0;
    els['input-region'].addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      els['dropzone-overlay'].classList.add('active');
    });
    els['input-region'].addEventListener('dragover', (e) => e.preventDefault());
    els['input-region'].addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) els['dropzone-overlay'].classList.remove('active');
    });
    els['input-region'].addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      els['dropzone-overlay'].classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        await Attachments.addFiles(e.dataTransfer.files, refreshAttachmentTray);
      }
    });

    // Paste image directly into the input
    els['chat-input'].addEventListener('paste', async (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(it => it.type.startsWith('image/'));
      if (imageItems.length) {
        const files = imageItems.map(it => it.getAsFile()).filter(Boolean);
        if (files.length) {
          e.preventDefault();
          await Attachments.addFiles(files, refreshAttachmentTray);
        }
      }
    });

    els['btn-lightbox-close'].addEventListener('click', () => Attachments.closeLightbox());
    els['lightbox-overlay'].addEventListener('click', (e) => {
      if (e.target === els['lightbox-overlay']) Attachments.closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Attachments.closeLightbox();
        if (Preview.isOpen()) Preview.close();
      }
    });

    els['chat-input'].addEventListener('input', () => {
      Anim.autoGrowTextarea(els['chat-input']);
      updateSendButtonState();
    });
    els['chat-input'].addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendCurrentInput();
      }
    });
    els['btn-send'].addEventListener('click', () => sendCurrentInput());

    els['quick-actions'].addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-action-btn');
      if (!btn) return;
      const prompt = btn.dataset.prompt;
      const modelId = btn.dataset.model;
      if (modelId) selectModel(modelId);
      els['chat-input'].value = prompt === 'Tell Me A Riddle' ? 'Give me a riddle' : `${prompt}: `;
      Anim.autoGrowTextarea(els['chat-input']);
      updateSendButtonState();
      els['chat-input'].focus();
      const len = els['chat-input'].value.length;
      els['chat-input'].setSelectionRange(len, len);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) UI.toggleSidebar(false);
    });
  }

  function bindSidebarItemEvents() {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-item-delete')) return;
        const id = item.dataset.id;
        openConversation(id);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openConversation(item.dataset.id);
      });
    });
    document.querySelectorAll('.chat-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        deleteConversation(id);
      });
    });
  }

  function openConversation(id) {
    const convo = state.conversations.find(c => c.id === id);
    if (!convo) return;
    state.activeConvoId = id;
    Storage.setActiveConvoId(id);
    state.selectedModel = convo.modelId || state.selectedModel;
    refreshSidebar();
    refreshModelUI();
    renderConversation(convo);
    UI.toggleSidebar(false);
  }

  function deleteConversation(id) {
    Storage.deleteConversation(id);
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.activeConvoId === id) {
      state.activeConvoId = null;
      Storage.setActiveConvoId(null);
      showWelcomeScreen();
    }
    refreshSidebar();
  }

  function bindModelDropdownEvents() {
    document.querySelectorAll('.model-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectModel(opt.dataset.modelId);
        UI.toggleModelDropdown(false);
      });
    });
  }

  function selectModel(modelId) {
    state.selectedModel = modelId;
    Storage.setSelectedModel(modelId);
    const convo = getActiveConvo();
    if (convo) {
      convo.modelId = modelId;
      persistConvo(convo);
    }
    refreshModelUI();
    Anim.pulseModelPill();
  }

  function bindMessageActionEvents() {
    els['chat-inner'].querySelectorAll('[data-action="copy"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bubble = btn.closest('.msg-col').querySelector('.msg-bubble');
        navigator.clipboard.writeText(bubble.innerText).then(() => {
          UI.toast('Response copied.', 'success');
        }).catch(() => UI.toast('Unable to copy.', 'error'));
      });
    });

    els['chat-inner'].querySelectorAll('[data-action="like"]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const dislikeBtn = btn.closest('.msg-actions').querySelector('[data-action="dislike"]');
        if (btn.classList.contains('active')) dislikeBtn.classList.remove('active');
      });
    });
    els['chat-inner'].querySelectorAll('[data-action="dislike"]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const likeBtn = btn.closest('.msg-actions').querySelector('[data-action="like"]');
        if (btn.classList.contains('active')) likeBtn.classList.remove('active');
      });
    });

    els['chat-inner'].querySelectorAll('[data-action="regenerate"]').forEach(btn => {
      btn.addEventListener('click', () => regenerateLast());
    });

    els['chat-inner'].querySelectorAll('[data-retry="1"]').forEach(btn => {
      btn.addEventListener('click', () => regenerateLast());
    });

    els['chat-inner'].querySelectorAll('[data-copy-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = document.getElementById(btn.dataset.copyCode);
        navigator.clipboard.writeText(pre.textContent).then(() => {
          UI.toast('Code copied.', 'success');
        }).catch(() => UI.toast('Unable to copy code.', 'error'));
      });
    });

    els['chat-inner'].querySelectorAll('[data-download-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = document.getElementById(btn.dataset.downloadCode);
        const lang = btn.dataset.lang || 'txt';
        const ext = { javascript: 'js', python: 'py', html: 'html', css: 'css', java: 'java', php: 'php', 'c++': 'cpp', json: 'json', bash: 'sh', sql: 'sql' }[lang.toLowerCase()] || 'txt';
        const blob = new Blob([pre.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snippet.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    els['chat-inner'].querySelectorAll('[data-preview-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = document.getElementById(btn.dataset.previewCode);
        const langEl = btn.closest('.code-block').querySelector('.code-block-lang');
        const lang = langEl ? langEl.textContent : 'html';
        Preview.open(pre.textContent, lang, `${getModel(state.selectedModel).label} · ${lang.toUpperCase()}`);
      });
    });
  }

  async function regenerateLast() {
    const convo = getActiveConvo();
    if (!convo || state.isSending) return;

    // remove trailing assistant message(s) from state and DOM
    while (convo.messages.length && convo.messages[convo.messages.length - 1].role === 'assistant') {
      convo.messages.pop();
    }
    persistConvo(convo);
    renderConversation(convo);

    const providerId = getModel(convo.modelId).provider;
    const providerConf = Storage.getProvider(providerId);
    await runAssistantTurn(convo, providerId, providerConf);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
