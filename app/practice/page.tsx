import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Practice' };

export default function Page() {
  return <ComingSoon title="Practice" phase={6} what="The problem bank and journal" />;
}
