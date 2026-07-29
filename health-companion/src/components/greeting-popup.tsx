'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { greetingForTime, quoteOfTheDay } from '@/lib/quotes';
import { timeOfDay, type TimeOfDay } from '@/lib/utils';

/** Time-of-day greeting shown once per slot per day (tracked in localStorage). */
export function GreetingPopup({ lang }: { lang: 'hi' | 'en' }) {
  const [open, setOpen] = useState(false);
  const [tod, setTod] = useState<TimeOfDay>('morning');

  useEffect(() => {
    const now = new Date();
    const slot = timeOfDay(now);
    const key = `greeting-${now.toDateString()}-${slot}`;
    if (!localStorage.getItem(key)) {
      setTod(slot);
      setOpen(true);
      localStorage.setItem(key, '1');
    }
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} showClose={false} className="text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg">
        <Heart className="h-10 w-10 fill-white text-white" />
      </div>
      <h2 className="text-elder-xl font-bold">{greetingForTime(tod, lang)}</h2>
      <p className="mt-4 rounded-2xl bg-muted p-4 text-elder-base italic text-muted-foreground">
        “{quoteOfTheDay(lang)}”
      </p>
      <Button size="lg" className="mt-6 w-full" onClick={() => setOpen(false)}>
        {lang === 'hi' ? 'धन्यवाद ❤️' : 'Thank you ❤️'}
      </Button>
    </Dialog>
  );
}
