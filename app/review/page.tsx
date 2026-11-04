import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Review' };

export default function Page() {
  return <ComingSoon title="Review" phase={6} what="The review queue" />;
}
