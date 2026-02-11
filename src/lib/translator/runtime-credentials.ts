export interface RuntimeTranslatorCredentials {
  openaiApiKey?: string;
  geminiApiKey?: string;
}

const GLOBAL_CREDENTIALS_KEY = '__PROJECT_TRANSLATOR_RUNTIME_CREDENTIALS__';

function normalizeApiKey(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getMutableCredentialStore() {
  const globalObject = globalThis as typeof globalThis & {
    [GLOBAL_CREDENTIALS_KEY]?: RuntimeTranslatorCredentials;
  };

  if (!globalObject[GLOBAL_CREDENTIALS_KEY]) {
    globalObject[GLOBAL_CREDENTIALS_KEY] = {};
  }

  return globalObject[GLOBAL_CREDENTIALS_KEY];
}

export function getRuntimeCredentials() {
  const store = getMutableCredentialStore();
  return {
    openaiApiKey: store.openaiApiKey,
    geminiApiKey: store.geminiApiKey,
  } as RuntimeTranslatorCredentials;
}

export function updateRuntimeCredentials(input: {
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
}) {
  const store = getMutableCredentialStore();

  if (Object.prototype.hasOwnProperty.call(input, 'openaiApiKey')) {
    store.openaiApiKey = normalizeApiKey(input.openaiApiKey);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'geminiApiKey')) {
    store.geminiApiKey = normalizeApiKey(input.geminiApiKey);
  }

  return getRuntimeCredentials();
}

export function resolveOpenAiApiKey() {
  const store = getMutableCredentialStore();
  return store.openaiApiKey ?? process.env.OPENAI_API_KEY;
}

export function resolveGeminiApiKey() {
  const store = getMutableCredentialStore();
  return store.geminiApiKey ?? process.env.GEMINI_API_KEY;
}
