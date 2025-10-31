import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { registerDeletions } from '../_store';
import { ensureAuthorized } from '../_auth';

type DraftEntry = {
  prayer_id: string;
  timestamp: number;
};

type DeletePayload = {
  entries?: DraftEntry[];
};

export async function POST(request: Request) {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json()) as DeletePayload;
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];

    const sanitized = entries.filter(isDraftEntry);
    if (sanitized.length !== entries.length) {
      return json({ error: 'Invalid entry payload supplied.' }, { status: 400 });
    }

    const deleted = await registerDeletions(sanitized);
    return json({ deleted });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    console.error('Failed to handle journal delete', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function isDraftEntry(value: unknown): value is DraftEntry {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as DraftEntry).prayer_id === 'string' &&
    typeof (value as DraftEntry).timestamp === 'number'
  );
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
