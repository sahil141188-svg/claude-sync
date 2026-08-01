'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('लॉगिन नहीं हो पाया। Email/password जाँच लें।');
      setLoading(false);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-20 w-20 animate-heartbeat items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg">
            <HeartPulse className="h-10 w-10" />
          </div>
          <CardTitle className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-elder-xl text-transparent">
            Healthcare App
          </CardTitle>
          <CardDescription>आपके स्वास्थ्य साथी में स्वागत है ❤️</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="papa@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-2xl bg-destructive/10 p-3 text-center text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'लॉगिन हो रहा है…' : 'लॉगिन करें'}
            </Button>
          </form>
          <p className="mt-4 text-center text-base text-muted-foreground">
            Accounts caregiver द्वारा Supabase में बनाए जाते हैं।
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
