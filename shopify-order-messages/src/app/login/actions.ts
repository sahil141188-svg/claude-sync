'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return 'Enter your email and password.';

  let error: { message: string; code?: string; status?: number } | null = null;
  try {
    const supabase = await createClient();
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (err) {
    error = { message: (err as Error).message };
  }
  if (error) {
    const wrongCredentials =
      error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message);
    if (wrongCredentials) return 'Email or password is not correct.';
    console.error('[login] sign-in failed', error);
    return `Could not reach the login service (${error.message}). Check the Supabase settings in Vercel.`;
  }
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
