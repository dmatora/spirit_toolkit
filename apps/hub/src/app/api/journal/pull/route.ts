import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getSince } from '../_store';
import { ensureAuthorized } from '../_auth';

export async function GET(request: Request) {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam ? Number(sinceParam) : 0;
    const threshold = Number.isFinite(since) ? since : 0;

    const { entries, deletions, syncedUntil } = await getSince(threshold);

    return json({ entries, deletions, syncedUntil });
  } catch (error) {
    console.error('Failed to handle journal pull', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function json(
  body: Record<string, unknown>,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
