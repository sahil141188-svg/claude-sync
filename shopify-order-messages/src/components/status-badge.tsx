import type { MessageStatus } from '@/lib/types';

const LABELS: Record<MessageStatus, string> = {
  queued: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

/**
 * delivered / read: Near Black on White with a Red dot
 * failed: Red
 * queued (pending): Yellow badge
 * sent: Near Black on White with an outlined dot
 * cancelled / skipped: quiet grey tint
 */
export function StatusBadge({ status }: { status: MessageStatus }) {
  const base = 'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap';
  switch (status) {
    case 'delivered':
    case 'read':
      return (
        <span className={`${base} border border-ink-20 bg-white text-ink`}>
          <span className="h-2 w-2 rounded-full bg-red" aria-hidden />
          {LABELS[status]}
        </span>
      );
    case 'sent':
      return (
        <span className={`${base} border border-ink-20 bg-white text-ink`}>
          <span className="h-2 w-2 rounded-full border-2 border-ink-60" aria-hidden />
          {LABELS[status]}
        </span>
      );
    case 'failed':
      return <span className={`${base} bg-red text-white`}>{LABELS[status]}</span>;
    case 'queued':
      return <span className={`${base} bg-yellow text-ink`}>{LABELS[status]}</span>;
    default:
      return <span className={`${base} bg-ink-5 text-ink-60`}>{LABELS[status]}</span>;
  }
}

export function TestBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-yellow-20 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-80">
      Test
    </span>
  );
}
