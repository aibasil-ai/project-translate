export type SourceType = 'folder' | 'github';

export interface TranslateContext {
  relativePath: string;
  sourceType: SourceType;
  targetLanguage: string;
}

export interface TranslatorProvider {
  translate: (text: string, context: TranslateContext) => Promise<string>;
}

export type TranslatorProviderMap = Record<string, TranslatorProvider>;
