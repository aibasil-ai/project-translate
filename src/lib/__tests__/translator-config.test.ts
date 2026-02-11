import { describe, expect, it } from 'vitest';

import { assertTranslatorConfiguration } from '@/lib/jobs/service';

describe('assertTranslatorConfiguration', () => {
  it('throws for openai when OPENAI_API_KEY is missing', () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => assertTranslatorConfiguration('openai')).toThrow('OPENAI_API_KEY');

    if (previous) {
      process.env.OPENAI_API_KEY = previous;
    }
  });

  it('throws for gemini when GEMINI_API_KEY is missing', () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    expect(() => assertTranslatorConfiguration('gemini')).toThrow('GEMINI_API_KEY');

    if (previous) {
      process.env.GEMINI_API_KEY = previous;
    }
  });

  it('allows local provider without mandatory key', () => {
    expect(() => assertTranslatorConfiguration('local')).not.toThrow();
  });
});
