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

  it('falls back to the built-in project settings when values were pasted masked', async () => {
    const env = await load('https://mnxyqvtqegywxy\u2022\u2022\u2022', 'eyJhbGciOiJIUzI\u2022\u2022\u2022\u2022');
    expect(env.SUPABASE_URL).toBe('https://mnxyqvtqegywxybeobzk.supabase.co');
    expect(env.SUPABASE_ANON_KEY.startsWith('eyJ')).toBe(true);
    expect(env.SUPABASE_ANON_KEY).not.toMatch(/\u2022/);
    expect(env.configProblems()).toEqual([]);
  });

  it('keeps a local http URL (local development)', async () => {
    const env = await load('http://localhost:54321', 'a.b.c');
    expect(env.SUPABASE_URL).toBe('http://localhost:54321');
    expect(env.SUPABASE_ANON_KEY).toBe('a.b.c');
  });

  it('falls back when settings are missing', async () => {
    const env = await load('', '');
    expect(env.SUPABASE_URL).toBe('https://mnxyqvtqegywxybeobzk.supabase.co');
    expect(env.configProblems()).toEqual([]);
  });

  it('never pairs the built-in key with a different project', async () => {
    const env = await load('https://other.supabase.co', 'eyJhbGciOiJIUzI\u2022\u2022');
    expect(env.SUPABASE_URL).toBe('https://other.supabase.co');
    expect(env.configProblems().join(' ')).toMatch(/ANON_KEY contains hidden characters/);
  });
});
