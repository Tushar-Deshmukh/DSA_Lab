import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Bookmarks' };

export default function Page() {
  return <ComingSoon title="Bookmarks" phase={7} what="Bookmarks" />;
}
