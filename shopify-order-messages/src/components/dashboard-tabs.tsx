'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/timeline', label: 'Order Timeline' },
  { href: '/dashboard/failed', label: 'Failed' },
  { href: '/dashboard/templates', label: 'Templates' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function DashboardTabs({ failedCount }: { failedCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard sections" className="border-b border-ink-10 bg-white">
      <ul className="mx-auto flex max-w-5xl overflow-x-auto px-2 sm:px-4">
        {TABS.map((t) => {
          const active = t.href === '/dashboard' ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
                  active ? 'border-red text-ink' : 'border-transparent text-ink-60 hover:text-maroon'
                }`}
              >
                {t.label}
                {t.href === '/dashboard/failed' && failedCount > 0 && (
                  <span className="rounded-full bg-red px-1.5 text-[11px] font-semibold leading-5 text-white">
                    {failedCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
