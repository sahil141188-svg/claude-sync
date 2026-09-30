import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(url: string, key: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', key);
  return import('@/lib/supabase/env');
}

afterEach(() => vi.unstubAllEnvs());

describe('supabase env', () => {
  it('cleans pasted whitespace and trailing slashes', async () => {
    const env = await load(' https://abc.supabase.co/ \n', ' a.b.c \n');
    expect(env.SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(env.SUPABASE_ANON_KEY).toBe('a.b.c');
    expect(env.configProblems()).toEqual([]);
  });

  it('flags masked values copied from a dashboard', async () => {
    const env = await load('https://abc.supabase.co', 'eyJhbGciOiJIUzI••••');
    expect(env.configProblems().join(' ')).toMatch(/ANON_KEY contains hidden characters/);
  });

  it('flags a bad or empty URL', async () => {
    expect((await load('abc.supabase.co', 'a.b.c')).configProblems().join(' ')).toMatch(/should look like/);
    expect((await load('', 'a.b.c')).configProblems().join(' ')).toMatch(/URL is empty/);
  });
});
