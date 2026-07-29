'use client';

import { RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Friendly full-page error screen instead of Next.js's raw "Application error". */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-6 text-center">
      <span className="text-6xl">🙏</span>
      <h1 className="text-elder-xl font-bold">कुछ गड़बड़ हो गई</h1>
      <p className="max-w-sm text-elder-base text-muted-foreground">
        चिंता न करें — आपका data सुरक्षित है। नीचे बटन दबाकर दोबारा कोशिश करें।
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button size="lg" onClick={() => reset()}>
          <RefreshCw className="h-6 w-6" /> दोबारा कोशिश करें
        </Button>
        <Button size="lg" variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          <Home className="h-6 w-6" /> Home पर जाएँ
        </Button>
      </div>
    </main>
  );
}
