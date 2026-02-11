import { resolveOpenAiApiKey } from '@/lib/translator/runtime-credentials';
import type { TranslatorProvider } from '@/lib/translator/types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const openaiProvider: TranslatorProvider = {
  async translate(text, context) {
    const apiKey = resolveOpenAiApiKey();

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate content to ${context.targetLanguage}. Keep original structure, formatting, and code blocks untouched whenever possible.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI translation failed: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.length) {
      throw new Error('OpenAI translation returned empty content');
    }

    return content;
  },
};
