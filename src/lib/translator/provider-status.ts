import { resolveGeminiApiKey, resolveOpenAiApiKey } from '@/lib/translator/runtime-credentials';

export type ProviderStatusMap = {
  openai: boolean;
  gemini: boolean;
  local: boolean;
};

export function getProviderStatusFromEnv(): ProviderStatusMap {
  return {
    openai: Boolean(resolveOpenAiApiKey()),
    gemini: Boolean(resolveGeminiApiKey()),
    local: true,
  };
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
