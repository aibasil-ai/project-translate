import type { TranslatorProvider } from '@/lib/translator/types';

export const localProvider: TranslatorProvider = {
  async translate(text, context) {
    const endpoint = process.env.LOCAL_TRANSLATOR_URL;

    if (!endpoint) {
      return `[${context.targetLanguage}] ${text}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage: context.targetLanguage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local translation failed: ${errorText}`);
    }

    const data = await response.json();

    if (typeof data?.translatedText !== 'string') {
      throw new Error('Local translator returned invalid payload');
    }

    return data.translatedText;
  },
};
