import { NextResponse } from 'next/server';

import { getProviderStatusFromEnv } from '@/lib/translator/provider-status';
import { updateRuntimeCredentials } from '@/lib/translator/runtime-credentials';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    providerStatus: getProviderStatusFromEnv(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    updateRuntimeCredentials({
      openaiApiKey: typeof payload?.openaiApiKey === 'string' ? payload.openaiApiKey : undefined,
      geminiApiKey: typeof payload?.geminiApiKey === 'string' ? payload.geminiApiKey : undefined,
    });

    return NextResponse.json({
      providerStatus: getProviderStatusFromEnv(),
    });
  } catch {
    return NextResponse.json({ error: '無法儲存金鑰設定' }, { status: 400 });
  }
}
