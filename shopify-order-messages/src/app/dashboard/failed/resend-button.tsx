'use client';

import { useState, useTransition } from 'react';
import { resend } from '../actions';

export function ResendButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        disabled={pending || result?.ok}
        onClick={() => start(async () => setResult(await resend(id)))}
        className="h-11 rounded-lg bg-red px-5 text-sm font-semibold text-white transition-colors hover:bg-maroon disabled:opacity-60"
      >
        {pending ? 'Sending' : result?.ok ? 'Sent' : 'Resend'}
      </button>
      {result && !result.ok && <p className="max-w-xs text-xs text-maroon">{result.message}</p>}
    </div>
  );
}
