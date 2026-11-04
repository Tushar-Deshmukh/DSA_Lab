import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Patterns' };

export default function Page() {
  return <ComingSoon title="Patterns" phase={5} what="The pattern atlas" />;
}
