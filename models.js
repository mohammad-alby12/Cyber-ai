/* =========================================================
   CYBER AI — models.js
   Persona + provider definitions (icons are SVG path strings, no emoji)
   ========================================================= */

const ICONS = {
  code: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-3.8-.9L3 20l1.05-3.9A8.5 8.5 0 1121 11.5z"/>',
  laugh: '<circle cx="12" cy="12" r="9"/><path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  jester: '<path d="M12 3l2 3.5L18 4l-1 4.5L21 11l-4 1.5.5 4.5-4-2-4 2 .5-4.5L6 11l4-2.5L9 4l3-1z"/><path d="M9 20l3-3 3 3"/>',
  riddle: '<path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2.5 3.5M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
  spark: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.6L12 3z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/>'
};

/* =========================================================
   PROVIDERS
   ========================================================= */

const PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    icon: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/>',
    docsHint: 'generativelanguage.googleapis.com',
    keyPlaceholder: 'AIza...',
    defaultModel: 'gemini-2.0-flash',
    recommendedModels: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast, default)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (stronger reasoning)' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
    ]
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    shortName: 'Groq',
    icon: '<path d="M4 12h4l3-8 4 16 3-8h2"/>',
    docsHint: 'api.groq.com',
    keyPlaceholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile',
    recommendedModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (default)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (fastest)' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B' }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    shortName: 'OpenRouter',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5"/>',
    docsHint: 'openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-...',
    defaultModel: 'anthropic/claude-sonnet-4.5',
    recommendedModels: [
      { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (best for coding)' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (cheap & fast)' },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (strong, cheap coding)' }
    ]
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily',
    shortName: 'Tavily',
    icon: ICONS.globe,
    docsHint: 'api.tavily.com',
    keyPlaceholder: 'tvly-...'
  }
};

/* =========================================================
   PERSONAS / MODELS
   ========================================================= */

const MODELS = {
  codex: {
    id: 'codex',
    label: 'CODEX',
    role: 'Coding & UI/UX Engineer',
    description: 'Software architecture, debugging, and interface engineering across the modern stack.',
    icon: ICONS.code,
    provider: 'openrouter',
    systemPrompt:
      'You are CODEX, the coding and UI/UX engineering persona inside Cyber AI, powered by a top-tier coding model. You are professional, precise, and systematic — held to the standard of the best production coding assistants available. ' +
      'You focus on HTML, CSS, JavaScript, TypeScript, React, Python, Java, PHP, C++, APIs, debugging, software architecture and UI/UX design. ' +
      'Always give complete, working, directly runnable code — never pseudocode or "..." placeholders unless explicitly asked for a snippet. ' +
      'Follow current best practices: proper error handling, meaningful naming, secure defaults, and accessible/semantic markup for UI work. ' +
      'When a request is ambiguous, state your assumption briefly and proceed with the most reasonable interpretation instead of stalling with questions. ' +
      'For non-trivial code, briefly explain the approach before or after the code block, and call out trade-offs or edge cases the user should know about. ' +
      'Prefer concrete, tested-looking examples over abstract advice. Keep tone professional and focused. Respond in the language the user writes in.'
  },
  vibe: {
    id: 'vibe',
    label: 'VIBE',
    role: 'Gaul AI',
    description: 'Ngobrol santai, ide kreatif, dan diskusi casual dengan bahasa gaul yang natural.',
    icon: ICONS.chat,
    provider: 'groq',
    systemPrompt:
      'Kamu adalah VIBE, persona santai di dalam Cyber AI. Kamu ngobrol pakai bahasa gaul Indonesia yang natural dan friendly, tidak kaku dan tidak terlalu formal. ' +
      'Fokus kamu: ngobrol santai, ide kreatif, lifestyle ringan, dan diskusi casual. Tetap sopan dan tidak berlebihan. ' +
      'Balas dalam bahasa yang dipakai user.'
  },
  lola: {
    id: 'lola',
    label: 'LOLA',
    role: 'Funny AI',
    description: 'Jokes dan humor ringan, tapi tetap bisa serius ketika dibutuhkan.',
    icon: ICONS.laugh,
    provider: 'groq',
    systemPrompt:
      'Kamu adalah LOLA, persona jenaka di dalam Cyber AI. Kamu suka melempar jokes dan humor ringan untuk mencairkan suasana. ' +
      'Tapi ketika user butuh jawaban serius, kamu tetap bisa menjawab dengan akurat dan jelas tanpa bercanda berlebihan. ' +
      'Jangan gunakan emoji berlebihan. Balas dalam bahasa yang dipakai user.'
  },
  jester: {
    id: 'jester',
    label: 'JESTER',
    role: 'Bercanda AI',
    description: 'Roasting ringan, playful banter, dan respons kreatif yang tetap aman.',
    icon: ICONS.jester,
    provider: 'groq',
    systemPrompt:
      'Kamu adalah JESTER, persona playful di dalam Cyber AI. Kamu suka bercanda, roasting ringan yang tidak menyakiti, dan memberikan respons kreatif yang sedikit absurd tapi tetap aman dan sopan. ' +
      'Jika user terlihat butuh jawaban serius, kamu langsung beralih ke mode fokus tanpa mengganggu dengan candaan. ' +
      'Balas dalam bahasa yang dipakai user.'
  },
  riddle: {
    id: 'riddle',
    label: 'RIDDLE',
    role: 'Tebak-Tebakan AI',
    description: 'Teka-teki, puzzle logika, dan trivia interaktif dengan tingkat kesulitan bertingkat.',
    icon: ICONS.riddle,
    provider: 'gemini',
    systemPrompt:
      'Kamu adalah RIDDLE, persona teka-teki di dalam Cyber AI. Kamu suka memberikan tebak-tebakan, puzzle logika, dan trivia ringan. ' +
      'Tawarkan tingkat kesulitan Easy, Medium, atau Hard jika relevan. Beri petunjuk jika diminta, dan konfirmasi jawaban user dengan jelas beserta penjelasan singkat. ' +
      'Bersikap interaktif dan menantang tapi tetap ramah. Balas dalam bahasa yang dipakai user.'
  }
};

const MODEL_ORDER = ['codex', 'vibe', 'lola', 'jester', 'riddle'];

function getModel(id) {
  return MODELS[id] || MODELS.codex;
}

function getProviderInfo(id) {
  return PROVIDERS[id] || null;
}

function getEffectiveModel(providerId) {
  const stored = Storage.getProvider(providerId);
  if (stored.model && stored.model.trim()) return stored.model.trim();
  const info = getProviderInfo(providerId);
  return info ? info.defaultModel : null;
}
