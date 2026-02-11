import { describe, expect, it } from 'vitest';

import { createTranslatorRegistry, getTranslatorProvider, listTranslatorProviders } from '@/lib/translator';

describe('translator registry', () => {
  it('exposes built-in providers', () => {
    const providers = listTranslatorProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('local');
    expect(providers).toContain('gemini');
  });

  it('throws when provider is unknown', () => {
    expect(() => getTranslatorProvider('unknown')).toThrow('Unsupported translator provider');
  });

  it('dispatches translation calls to selected provider', async () => {
    const registry = createTranslatorRegistry({
      mock: {
        async translate(text) {
          return `zh:${text}`;
        },
      },
    });

    const translated = await registry.get('mock').translate('hello');
    expect(translated).toBe('zh:hello');
  });
});
