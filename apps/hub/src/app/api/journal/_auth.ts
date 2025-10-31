import { NextResponse } from 'next/server';

const SECRET = process.env.SPIRIT_SYNC_SECRET ?? process.env.PRAYER_SYNC_SECRET ?? '';
const IS_DEV = process.env.NODE_ENV?.toLowerCase() !== 'production';

if (!SECRET) {
  const message =
    "[journal auth] SPIRIT_SYNC_SECRET/PRAYER_SYNC_SECRET is not set. Journal API endpoints will " +
    (IS_DEV ? 'remain open (development mode).' : 'reject all requests.');
  // eslint-disable-next-line no-console
  console.warn(message);
}

export function ensureAuthorized(request: Request): NextResponse | null {
  if (!SECRET) {
    if (IS_DEV) {
      return null;
    }
    return NextResponse.json({ error: 'Server misconfigured: missing sync secret' }, { status: 503 });
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
