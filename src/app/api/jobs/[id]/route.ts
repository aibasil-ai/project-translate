import { NextResponse } from 'next/server';

import { cancelJobOrThrow, getJobOrThrow, toPublicJobView, UserInputError } from '@/lib/jobs/service';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = getJobOrThrow(id);

    return NextResponse.json({
      job: toPublicJobView(job, new URL(request.url).origin),
    });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to retrieve job status' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const action = typeof payload?.action === 'string' ? payload.action : '';

    if (action !== 'cancel') {
      throw new UserInputError('Unsupported action. Expected action="cancel"');
    }

    const { id } = await context.params;
    const job = cancelJobOrThrow(id);

    return NextResponse.json({
      job: toPublicJobView(job, new URL(request.url).origin),
    });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to cancel translation job' }, { status: 500 });
  }
}
