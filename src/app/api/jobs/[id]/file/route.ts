import { NextResponse } from 'next/server';

import { getJobOrThrow, readTranslatedFile, UserInputError } from '@/lib/jobs/service';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = getJobOrThrow(id);

    if (job.status !== 'completed') {
      throw new UserInputError('Job is not completed yet');
    }

    const url = new URL(request.url);
    const relativePath = url.searchParams.get('path');

    if (!relativePath) {
      throw new UserInputError('Missing path query parameter');
    }

    const content = await readTranslatedFile(job, relativePath);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to read translated file' }, { status: 500 });
  }
}
