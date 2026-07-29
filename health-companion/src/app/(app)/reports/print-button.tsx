'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()}>
      <Download className="h-6 w-6" /> PDF Download
    </Button>
  );
}
