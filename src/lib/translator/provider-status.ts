import { resolveGeminiApiKey, resolveOpenAiApiKey } from '@/lib/translator/runtime-credentials';

export type ProviderStatusMap = {
  openai: boolean;
  gemini: boolean;
  local: boolean;
};

export type ProviderDefaultModelMap = {
  openai: string;
  gemini: string;
  local: string;
};

export const fallbackProviderDefaultModels: ProviderDefaultModelMap = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.0-flash',
  local: 'local-default',
};

export function getProviderStatusFromEnv(): ProviderStatusMap {
  return {
    openai: Boolean(resolveOpenAiApiKey()),
    gemini: Boolean(resolveGeminiApiKey()),
    local: true,
  };
}

export function getProviderDefaultModelsFromEnv(): ProviderDefaultModelMap {
  return {
    openai: process.env.OPENAI_MODEL?.trim() || fallbackProviderDefaultModels.openai,
    gemini: process.env.GEMINI_MODEL?.trim() || fallbackProviderDefaultModels.gemini,
    local: process.env.LOCAL_TRANSLATOR_MODEL?.trim() || fallbackProviderDefaultModels.local,
  };
}

export function getDefaultModelForProvider(provider: keyof ProviderDefaultModelMap) {
  const defaults = getProviderDefaultModelsFromEnv();
  return defaults[provider];
}

export function missingProviderHint(provider: keyof ProviderStatusMap) {
  if (provider === 'openai') {
    return '請先在畫面輸入 OpenAI API Key，或在 .env.local 設定 OPENAI_API_KEY';
  }

  if (provider === 'gemini') {
    return '請先在畫面輸入 Gemini API Key，或在 .env.local 設定 GEMINI_API_KEY';
  }

  return null;
}
