import { NextResponse } from 'next/server';

import {
  createFolderTranslationJob,
  createGithubTranslationJob,
  parseAllowedExtensions,
  resolveModelForTranslator,
  toPublicJobView,
  UserInputError,
} from '@/lib/jobs/service';

export const runtime = 'nodejs';

function asString(value: FormDataEntryValue | null | undefined, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const sourceType = asString(formData.get('sourceType'), 'folder');

      if (sourceType !== 'folder') {
        throw new UserInputError('Multipart requests only support folder source type');
      }

      const translator = asString(formData.get('translator'), 'openai');
      const model = resolveModelForTranslator(translator, asString(formData.get('model')));
      const targetLanguage = asString(formData.get('targetLanguage'), 'Traditional Chinese (zh-TW)');
      const outputFolder = asString(formData.get('outputFolder'));
      const allowedExtensions = parseAllowedExtensions(asString(formData.get('allowedExtensions')));

      const files = formData
        .getAll('files')
        .filter((item): item is File => item instanceof File);
      const paths = formData.getAll('paths').map((item) => asString(item as FormDataEntryValue));

      if (files.length !== paths.length) {
        throw new UserInputError('Uploaded files and paths do not match');
      }

      const job = await createFolderTranslationJob({
        translator,
        model,
        targetLanguage,
        outputFolder,
        allowedExtensions,
        files,
        paths,
      });

      return NextResponse.json(
        {
          job: toPublicJobView(job, new URL(request.url).origin),
        },
        { status: 202 },
      );
    }

    const payload = await request.json();

    if (payload?.sourceType !== 'github') {
      throw new UserInputError('JSON requests must use sourceType="github"');
    }

    const translator = typeof payload.translator === 'string' ? payload.translator : 'openai';

    const job = await createGithubTranslationJob({
      translator,
      model: resolveModelForTranslator(translator, typeof payload.model === 'string' ? payload.model : ''),
      targetLanguage:
        typeof payload.targetLanguage === 'string'
          ? payload.targetLanguage
          : 'Traditional Chinese (zh-TW)',
      outputFolder: typeof payload.outputFolder === 'string' ? payload.outputFolder : '',
      allowedExtensions: parseAllowedExtensions(payload.allowedExtensions),
      repoUrl: String(payload.repoUrl ?? ''),
    });

    return NextResponse.json(
      {
        job: toPublicJobView(job, new URL(request.url).origin),
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create translation job' }, { status: 500 });
  }
}
