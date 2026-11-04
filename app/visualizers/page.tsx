import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Visualizers' };

export default function Page() {
  return <ComingSoon title="Visualizers" phase={3} what="The visualizer gallery" />;
}
