import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Learn' };

export default function Page() {
  return <ComingSoon title="Learn" phase={5} what="The learning path and the lessons" />;
}
