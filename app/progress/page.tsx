import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Progress' };

export default function Page() {
  return <ComingSoon title="Progress" phase={7} what="The progress page" />;
}
