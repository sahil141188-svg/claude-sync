'use client';

import { useActionState } from 'react';
import { signIn } from './actions';

export function LoginForm({ notice }: { notice?: string }) {
  const [error, action, pending] = useActionState(signIn, null);
  const message = error ?? notice;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 w-full rounded-lg border border-ink-20 bg-white px-4 text-base hover:border-ink-40 focus:border-ink focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-lg border border-ink-20 bg-white px-4 text-base hover:border-ink-40 focus:border-ink focus:outline-none"
        />
      </label>
      {message && (
        <p role="alert" className="rounded-lg bg-red-10 px-4 py-3 text-sm text-maroon">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-red font-semibold text-white transition-colors hover:bg-maroon disabled:opacity-60"
      >
        {pending ? 'Signing in' : 'Sign in'}
      </button>
    </form>
  );
}
