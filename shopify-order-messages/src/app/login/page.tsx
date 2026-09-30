import { signOut } from './actions';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const notice =
    error === 'not_admin'
      ? 'This account is not on the dashboard list. Ask an admin to add your email to dashboard_admins.'
      : undefined;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="bg-maroon px-5 py-4 text-white">
        <p className="text-lg font-bold tracking-[0.2em]">ROBOTEK</p>
      </header>
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-12">
        <h1 className="text-2xl font-semibold">Order Messages</h1>
        <p className="mb-8 mt-1 text-ink-60">Sign in to view WhatsApp order updates.</p>
        <LoginForm notice={notice} />
        {notice && (
          <form action={signOut} className="mt-4">
            <button type="submit" className="h-12 w-full rounded-lg border border-ink-20 font-medium hover:border-maroon hover:text-maroon">
              Sign out of this account
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
