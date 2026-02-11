import fs from 'node:fs/promises';

import { NextResponse } from 'next/server';

import { ensureJobArtifactsExist, getJobOrThrow, UserInputError } from '@/lib/jobs/service';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = getJobOrThrow(id);

    await ensureJobArtifactsExist(job);

    const zipBuffer = await fs.readFile(job.zipPath);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${job.id}-translated.zip"`,
      },
    });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to download translated artifact' }, { status: 500 });
  }
}
