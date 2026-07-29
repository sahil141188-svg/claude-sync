import Link from 'next/link';
import {
  CalendarClock,
  ChevronRight,
  Dumbbell,
  Droplets,
  FileText,
  FolderOpen,
  HeartPulse,
  Lightbulb,
  Salad,
  Scale,
  Settings,
  Siren,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const LINKS = [
  { href: '/appointments', label: 'Doctor Appointments', desc: 'तारीख़ और समय के साथ', icon: CalendarClock, tone: 'text-primary' },
  { href: '/medical-reports', label: 'Medical Reports', desc: 'Lab reports upload और देखें', icon: FolderOpen, tone: 'text-violet-500' },
  { href: '/family', label: 'Family Members', desc: 'Alerts सबको, login भी', icon: Users, tone: 'text-secondary' },
  { href: '/bp', label: 'Blood Pressure', desc: 'BP readings और graph', icon: HeartPulse, tone: 'text-primary' },
  { href: '/weight', label: 'वज़न', desc: 'Weight और BMI', icon: Scale, tone: 'text-secondary' },
  { href: '/water', label: 'पानी', desc: 'Daily water tracker', icon: Droplets, tone: 'text-sky-500' },
  { href: '/exercise', label: 'Exercise', desc: 'सैर, योग, ध्यान', icon: Dumbbell, tone: 'text-amber-500' },
  { href: '/prescriptions', label: 'Prescriptions', desc: 'Upload और AI reading', icon: FileText, tone: 'text-violet-500' },
  { href: '/tips', label: 'Health Tips', desc: 'रोज़ की सलाह', icon: Lightbulb, tone: 'text-amber-500' },
  { href: '/food', label: 'खान-पान', desc: 'क्या खाएँ, क्या नहीं', icon: Salad, tone: 'text-success' },
  { href: '/reports', label: 'Reports (PDF)', desc: 'Doctor के लिए report', icon: FileText, tone: 'text-rose-500' },
  { href: '/emergency', label: 'Emergency', desc: 'One-tap call', icon: Siren, tone: 'text-destructive' },
  { href: '/settings', label: 'Settings', desc: 'Dark mode, भाषा, font', icon: Settings, tone: 'text-muted-foreground' },
];

export default function MorePage() {
  return (
    <div className="space-y-3 animate-fade-in-up">
      <h1 className="text-elder-xl font-bold">और भी</h1>
      {LINKS.map(({ href, label, desc, icon: Icon, tone }) => (
        <Link key={href} href={href} className="block">
          <Card className="transition-transform active:scale-[0.98]">
            <CardContent className="flex items-center gap-4 p-4">
              <Icon className={`h-8 w-8 shrink-0 ${tone}`} />
              <div className="flex-1">
                <p className="text-elder-base font-bold">{label}</p>
                <p className="text-base text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
