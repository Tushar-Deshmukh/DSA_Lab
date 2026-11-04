import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Notes' };

export default function Page() {
  return <ComingSoon title="Notes" phase={7} what="Notes and highlights" />;
}
