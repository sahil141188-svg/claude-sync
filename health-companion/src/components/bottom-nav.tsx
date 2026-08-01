'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, Droplets, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/medicines', label: 'Dawai', icon: Pill },
  { href: '/sugar', label: 'Sugar', icon: Droplets },
  { href: '/analytics', label: 'Charts', icon: BarChart3 },
  { href: '/more', label: 'More', icon: Menu },
];

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-border bg-card/90 backdrop-blur-lg">
      <ul className="flex">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full px-4 py-1 transition-all',
                    active && 'bg-primary/10'
                  )}
                >
                  <Icon className={cn('h-7 w-7 transition-transform', active && 'scale-110')} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
