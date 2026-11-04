import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Handbook' };

export default function Page() {
  return <ComingSoon title="Handbook" phase={5} what="The handbook with every roadmap section" />;
}
