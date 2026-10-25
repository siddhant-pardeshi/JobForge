// AI provider abstraction. Any OpenAI compatible endpoint, Anthropic Claude,
// a local Ollama, or nothing at all. Keys live only in the local data folder.
// Everything degrades to deterministic fallbacks when no provider is set.

const PRESETS = {
  openai: {
    label: 'OpenAI', kind: 'openai', baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'], freeTier: false,
    keyUrl: 'https://platform.openai.com/api-keys',
    blurb: 'The mainstream choice. Paid per token with a generous free usable tier for light jobs.'
  },
  anthropic: {
    label: 'Anthropic Claude', kind: 'anthropic', baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-haiku-latest', 'claude-sonnet-4-5', 'claude-opus-4-1'], freeTier: false,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    blurb: 'Claude writes the most natural cover letters and resume suggestions.'
  },
  groq: {
    label: 'Groq', kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], freeTier: true,
    keyUrl: 'https://console.groq.com/keys',
    blurb: 'Free tier with a generous rate limit and very fast open models.'
  },
  openrouter: {
    label: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free', 'google/gemini-2.0-flash-exp:free'], freeTier: true,
    keyUrl: 'https://openrouter.ai/keys',
    blurb: 'One key for hundreds of models, several marked free with daily limits.'
  },
  ollama: {
    label: 'Ollama on this machine', kind: 'openai', baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1', 'qwen2.5', 'gemma2'], freeTier: true, local: true,
    keyUrl: 'https://ollama.com/download',
    blurb: 'Runs fully offline. Your resume never leaves the machine. Needs no key.'
  },
  zai: {
    label: 'Z.ai GLM', kind: 'openai', baseUrl: 'https://api.z.ai/api/paas/v4',
    models: ['glm-4.6', 'glm-4.5-air', 'glm-4-flash'], freeTier: false,
    keyUrl: 'https://z.ai/manage-apikey/apikey-list',
    blurb: 'GLM models through the Z.ai open platform, OpenAI compatible endpoint.'
  },
  custom: {
    label: 'Custom OpenAI compatible', kind: 'openai', baseUrl: '',
    models: [], freeTier: false, keyUrl: '',
    blurb: 'Any endpoint that speaks the OpenAI chat completions protocol.'
  }
};

const TIMEOUT_MS = 60000;

function activeConfig(settings) {
  const llm = settings?.llm || {};
  const id = llm.providerId || 'none';
  if (id === 'none') return null;
  const preset = PRESETS[id];
  const conf = llm.providers?.[id] || {};
  const baseUrl = (conf.baseUrl || preset?.baseUrl || '').replace(/\/$/, '');
  if (!preset) return null;
  if (!baseUrl && id !== 'custom') return null;
  const model = conf.model || preset.models[0] || null;
  const apiKey = conf.apiKey || (id === 'ollama' ? 'ollama' : '');
  if (!apiKey && id !== 'ollama' && id !== 'custom') return null;
  if (id === 'custom' && !baseUrl) return null;
  return { id, preset, baseUrl, model, apiKey };
}

export function llmStatus(settings) {
  const conf = activeConfig(settings);
  if (!conf) return { ready: false, provider: null, model: null, message: 'No AI provider configured. Deterministic mode is active and every core feature still works.' };
  return { ready: true, provider: conf.preset.label, model: conf.model, message: `${conf.preset.label} ready with ${conf.model}` };
}

export async function chat(settings, { system, user, json = false, maxTokens = 1400 }) {
  const conf = activeConfig(settings);
  if (!conf) throw Object.assign(new Error('No AI provider is configured'), { code: 'NO_PROVIDER' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    if (conf.preset.kind === 'anthropic') return await callAnthropic(conf, { system, user, json, maxTokens, signal: controller.signal });
    return await callOpenAiCompatible(conf, { system, user, json, maxTokens, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The AI provider took too long to answer');
    if (err.code === 'NO_PROVIDER') throw err;
    const msg = String(err.message || err);
    // Never echo the key back in an error.
    throw new Error(msg.replace(conf.apiKey, '***'));
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(conf, { system, user, json, maxTokens, signal }) {
  const headers = { 'content-type': 'application/json' };
  if (conf.apiKey) headers.authorization = `Bearer ${conf.apiKey}`;
  const body = {
    model: conf.model,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  if (json && conf.id !== 'ollama') body.response_format = { type: 'json_object' };
  const res = await fetch(`${conf.baseUrl}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* body not json */ }
    throw new Error(`Provider answered HTTP ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Provider returned an empty answer');
  return text;
}

async function callAnthropic(conf, { system, user, json, maxTokens, signal }) {
  const res = await fetch(`${conf.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': conf.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: conf.model,
      max_tokens: maxTokens,
      system: system + (json ? ' Reply with a single valid JSON object and nothing else.' : ''),
      messages: [{ role: 'user', content: user }]
    }),
    signal
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* body not json */ }
    throw new Error(`Anthropic answered HTTP ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }
  const data = await res.json();
  const text = data.content?.map((c) => c.text).filter(Boolean).join('\n');
  if (!text) throw new Error('Anthropic returned an empty answer');
  return text;
}

export async function testProvider(settings, providerId) {
  const preset = PRESETS[providerId];
  if (!preset) return { ok: false, message: 'Unknown provider' };
  const probe = { ...settings, llm: { ...(settings.llm || {}), providerId } };
  const started = Date.now();
  try {
    const text = await chat(probe, { system: 'You are a connection probe.', user: 'Reply with exactly: ok', maxTokens: 16 });
    return { ok: true, message: `Connected in ${Date.now() - started} ms. Model said: ${text.slice(0, 40)}` };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === '{') depth++;
    else if (candidate[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(candidate.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export { PRESETS };
