import { geminiProvider } from '@/lib/translator/providers/gemini';
import { localProvider } from '@/lib/translator/providers/local';
import { openaiProvider } from '@/lib/translator/providers/openai';
import type { TranslatorProvider, TranslatorProviderMap } from '@/lib/translator/types';

const builtInProviders: TranslatorProviderMap = {
  openai: openaiProvider,
  local: localProvider,
  gemini: geminiProvider,
};

function getProviderOrThrow(providers: TranslatorProviderMap, providerName: string): TranslatorProvider {
  const provider = providers[providerName];

  if (!provider) {
    throw new Error(`Unsupported translator provider: ${providerName}`);
  }

  return provider;
}

export function createTranslatorRegistry(providers: TranslatorProviderMap) {
  return {
    get(providerName: string) {
      return getProviderOrThrow(providers, providerName);
    },
    list() {
      return Object.keys(providers);
    },
  };
}

const defaultRegistry = createTranslatorRegistry(builtInProviders);

export function getTranslatorProvider(providerName: string) {
  return defaultRegistry.get(providerName);
}

export function listTranslatorProviders() {
  return defaultRegistry.list();
}

export type { TranslateContext, SourceType, TranslatorProvider, TranslatorProviderMap } from '@/lib/translator/types';
