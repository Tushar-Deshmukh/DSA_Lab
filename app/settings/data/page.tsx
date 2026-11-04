import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Your data' };

export default function Page() {
  return <ComingSoon title="Your data" phase={7} what="Export, import, legacy backup import and erase" />;
}
