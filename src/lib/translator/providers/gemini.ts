import { resolveGeminiApiKey } from '@/lib/translator/runtime-credentials';
import type { TranslatorProvider } from '@/lib/translator/types';

export const geminiProvider: TranslatorProvider = {
  async translate(text, context) {
    const apiKey = resolveGeminiApiKey();

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following content to ${context.targetLanguage}. Preserve formatting:\n\n${text}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini translation failed: ${errorText}`);
    }

    const data = await response.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof translated !== 'string' || !translated.length) {
      throw new Error('Gemini translation returned empty content');
    }

    return translated;
  },
};
