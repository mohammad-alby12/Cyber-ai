/* =========================================================
   CYBER AI — api.js
   Provider communication layer: Gemini, Groq, OpenRouter, Tavily
   ========================================================= */

const CyberAPI = (() => {

  class ProviderError extends Error {
    constructor(message, type) {
      super(message);
      this.type = type || 'unknown';
    }
  }

  async function withTimeout(promise, ms = 30000) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ProviderError('Request timed out.', 'timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  function classifyHttpError(status) {
    if (status === 401 || status === 403) return new ProviderError('Invalid API key.', 'auth');
    if (status === 429) return new ProviderError('Rate limit reached. Try again shortly.', 'rate_limit');
    if (status >= 500) return new ProviderError('Provider is currently unavailable.', 'provider_unavailable');
    return new ProviderError('Unable to connect to provider.', 'unknown');
  }

  /* ---------- GEMINI ---------- */

  async function callGemini(apiKey, model, messages, systemPrompt) {
    const modelId = model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const body = {
      contents,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
    };

    let res;
    try {
      res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }));
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError('Network error while contacting Gemini.', 'network');
    }

    if (!res.ok) throw classifyHttpError(res.status);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ProviderError('Received a malformed response from Gemini.', 'malformed');
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) throw new ProviderError('Gemini returned an empty response.', 'empty');
    return text;
  }

  /* ---------- GROQ (OpenAI-compatible) ---------- */

  async function callGroq(apiKey, model, messages, systemPrompt) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const chatMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    let res;
    try {
      res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: chatMessages
        })
      }));
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError('Network error while contacting Groq.', 'network');
    }

    if (!res.ok) throw classifyHttpError(res.status);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ProviderError('Received a malformed response from Groq.', 'malformed');
    }

    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) throw new ProviderError('Groq returned an empty response.', 'empty');
    return text;
  }

  /* ---------- OPENROUTER (OpenAI-compatible) ---------- */

  async function callOpenRouter(apiKey, model, messages, systemPrompt) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const chatMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    let res;
    try {
      res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Cyber AI'
        },
        body: JSON.stringify({
          model: model || 'anthropic/claude-sonnet-4.5',
          messages: chatMessages
        })
      }));
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError('Network error while contacting OpenRouter.', 'network');
    }

    if (!res.ok) throw classifyHttpError(res.status);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ProviderError('Received a malformed response from OpenRouter.', 'malformed');
    }

    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) throw new ProviderError('OpenRouter returned an empty response.', 'empty');
    return text;
  }

  /* ---------- TAVILY (web search) ---------- */

  async function callTavilySearch(apiKey, query) {
    const url = 'https://api.tavily.com/search';
    let res;
    try {
      res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 5
        })
      }), 15000);
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError('Network error while contacting Tavily.', 'network');
    }

    if (!res.ok) throw classifyHttpError(res.status);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ProviderError('Received a malformed response from Tavily.', 'malformed');
    }

    return data?.results || [];
  }

  /* ---------- Connection testing ---------- */

  async function testProvider(providerId, apiKey, model) {
    if (!apiKey) throw new ProviderError('No API key provided.', 'auth');

    if (providerId === 'gemini') {
      return callGemini(apiKey, model, [{ role: 'user', content: 'ping' }], 'Reply with the single word: pong');
    }
    if (providerId === 'groq') {
      return callGroq(apiKey, model, [{ role: 'user', content: 'ping' }], 'Reply with the single word: pong');
    }
    if (providerId === 'openrouter') {
      return callOpenRouter(apiKey, model, [{ role: 'user', content: 'ping' }], 'Reply with the single word: pong');
    }
    if (providerId === 'tavily') {
      return callTavilySearch(apiKey, 'test connection');
    }
    throw new ProviderError('Unknown provider.', 'unknown');
  }

  /* ---------- Unified send ---------- */

  async function sendMessage({ providerId, apiKey, model, messages, systemPrompt }) {
    if (!apiKey) {
      throw new ProviderError('No AI provider configured.', 'no_provider');
    }
    switch (providerId) {
      case 'gemini': return callGemini(apiKey, model, messages, systemPrompt);
      case 'groq': return callGroq(apiKey, model, messages, systemPrompt);
      case 'openrouter': return callOpenRouter(apiKey, model, messages, systemPrompt);
      default: throw new ProviderError('Unknown provider selected.', 'unknown');
    }
  }

  return {
    ProviderError,
    sendMessage,
    testProvider,
    callTavilySearch
  };
})();
