import { NextResponse } from 'next/server';

import { getJobOrThrow, listTranslatedFiles, UserInputError } from '@/lib/jobs/service';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = getJobOrThrow(id);

    if (job.status !== 'completed') {
      throw new UserInputError('Job is not completed yet');
    }

    const files = await listTranslatedFiles(job);

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to retrieve translated tree' }, { status: 500 });
  }
}
