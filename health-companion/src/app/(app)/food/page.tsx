import { Apple, Ban, Coffee, Moon, Salad, Sun } from 'lucide-react';
import { FOOD_GUIDE } from '@/lib/tips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  { key: 'eat', title: 'क्या खाएँ ✅', icon: <Apple className="h-6 w-6 text-success" />, tone: 'border-success/40 bg-success/5' },
  { key: 'avoid', title: 'किनसे बचें ❌', icon: <Ban className="h-6 w-6 text-destructive" />, tone: 'border-destructive/40 bg-destructive/5' },
  { key: 'breakfast', title: 'नाश्ते के idea', icon: <Coffee className="h-6 w-6 text-amber-500" />, tone: '' },
  { key: 'lunch', title: 'दोपहर के खाने के idea', icon: <Sun className="h-6 w-6 text-orange-500" />, tone: '' },
  { key: 'dinner', title: 'रात के खाने के idea', icon: <Moon className="h-6 w-6 text-indigo-500" />, tone: '' },
  { key: 'snacks', title: 'Healthy snacks', icon: <Salad className="h-6 w-6 text-emerald-500" />, tone: '' },
] as const;

export default function FoodPage() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Salad className="h-8 w-8 text-success" /> खान-पान
      </h1>
      <p className="text-elder-base text-muted-foreground">
        Diabetes और BP के लिए खाने की आसान guide।
      </p>

      {SECTIONS.map((s) => (
        <Card key={s.key} className={s.tone}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-elder-base">
              {s.icon} {s.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {FOOD_GUIDE[s.key].map((item, i) => (
                <li key={i} className="rounded-xl bg-card p-3 text-elder-base shadow-sm">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
