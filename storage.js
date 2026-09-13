/* =========================================================
   CYBER AI — storage.js
   localStorage wrapper: conversations, config, UI prefs, API keys
   ========================================================= */

const Storage = (() => {
  const KEYS = {
    CONVERSATIONS: 'cyberai_conversations',
    ACTIVE_CONVO: 'cyberai_active_convo',
    PROVIDERS: 'cyberai_providers',
    UI_PREFS: 'cyberai_ui_prefs',
    SELECTED_MODEL: 'cyberai_selected_model'
  };

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage read error', key, e);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error', key, e);
      return false;
    }
  }

  /* ---------- Conversations ---------- */

  function getConversations() {
    return safeGet(KEYS.CONVERSATIONS, []);
  }

  function saveConversations(list) {
    return safeSet(KEYS.CONVERSATIONS, list);
  }

  function upsertConversation(convo) {
    const list = getConversations();
    const idx = list.findIndex(c => c.id === convo.id);
    if (idx >= 0) {
      list[idx] = convo;
    } else {
      list.unshift(convo);
    }
    saveConversations(list);
  }

  function deleteConversation(id) {
    const list = getConversations().filter(c => c.id !== id);
    saveConversations(list);
  }

  function getActiveConvoId() {
    return safeGet(KEYS.ACTIVE_CONVO, null);
  }

  function setActiveConvoId(id) {
    safeSet(KEYS.ACTIVE_CONVO, id);
  }

  /* ---------- Provider config / API keys ---------- */
  // Structure: { gemini: {apiKey, connected}, groq: {...}, openrouter: {...}, tavily: {...} }

  function getProviders() {
    return safeGet(KEYS.PROVIDERS, {});
  }

  function getProvider(id) {
    const all = getProviders();
    return all[id] || { apiKey: '', connected: false, model: '' };
  }

  function setProviderKey(id, apiKey) {
    const all = getProviders();
    all[id] = { ...(all[id] || {}), apiKey, connected: false };
    safeSet(KEYS.PROVIDERS, all);
  }

  function setProviderModel(id, model) {
    const all = getProviders();
    all[id] = { ...(all[id] || {}), model };
    safeSet(KEYS.PROVIDERS, all);
  }

  function setProviderConnected(id, connected) {
    const all = getProviders();
    all[id] = { ...(all[id] || {}), connected };
    safeSet(KEYS.PROVIDERS, all);
  }

  function removeProviderKey(id) {
    const all = getProviders();
    delete all[id];
    safeSet(KEYS.PROVIDERS, all);
  }

  function hasAnyProviderConfigured() {
    const all = getProviders();
    return Object.values(all).some(p => p && p.apiKey);
  }

  /* ---------- UI prefs ---------- */

  function getUIPrefs() {
    return safeGet(KEYS.UI_PREFS, {
      webSearch: false,
      extendedThinking: false,
      sidebarOpen: false
    });
  }

  function setUIPref(key, value) {
    const prefs = getUIPrefs();
    prefs[key] = value;
    safeSet(KEYS.UI_PREFS, prefs);
  }

  /* ---------- Selected model ---------- */

  function getSelectedModel() {
    return safeGet(KEYS.SELECTED_MODEL, 'codex');
  }

  function setSelectedModel(modelId) {
    safeSet(KEYS.SELECTED_MODEL, modelId);
  }

  return {
    getConversations,
    saveConversations,
    upsertConversation,
    deleteConversation,
    getActiveConvoId,
    setActiveConvoId,
    getProviders,
    getProvider,
    setProviderKey,
    setProviderModel,
    setProviderConnected,
    removeProviderKey,
    hasAnyProviderConfigured,
    getUIPrefs,
    setUIPref,
    getSelectedModel,
    setSelectedModel
  };
})();
