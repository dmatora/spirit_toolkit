import { NextResponse } from 'next/server';

const SECRET = process.env.SPIRIT_SYNC_SECRET ?? process.env.PRAYER_SYNC_SECRET ?? '';

export function ensureAuthorized(request: Request): NextResponse | null {
  if (!SECRET) {
    // If no secret specified, allow access (development fallback).
    return null;
  }

  const headerToken =
    request.headers.get('x-spirit-sync-token') ?? request.headers.get('x-prayer-sync-token');
  const authHeader = request.headers.get('authorization');

  const provided =
    headerToken ??
    (authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null);

  if (provided && provided === SECRET) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
