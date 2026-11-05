'use client';

import type { VizNode } from '@/lib/viz/types';
import {
  Bits,
  Caption,
  Cells,
  ChipRows,
  CodeLines,
  Frames,
  Grid,
  Kv,
  Marks,
  Problem,
  Queue,
  Stack,
  Table,
  Vars,
} from './primitives/html';
import { Bars, Graph, Intervals, LinkedList, LogBars, Tree } from './primitives/svg';
import { Labelled } from './primitives/common';

function VizNodeView({ node }: { node: VizNode }) {
  switch (node.kind) {
    case 'cells':
      return <Cells node={node} />;
    case 'vars':
      return <Vars node={node} />;
    case 'kv':
      return <Kv node={node} />;
    case 'stack':
      return <Stack node={node} />;
    case 'queue':
      return <Queue node={node} />;
    case 'frames':
      return <Frames node={node} />;
    case 'tree':
      return <Tree node={node} />;
    case 'graph':
      return <Graph node={node} />;
    case 'grid':
      return <Grid node={node} />;
    case 'table':
      return <Table node={node} />;
    case 'list':
      return <LinkedList node={node} />;
    case 'intervals':
      return <Intervals node={node} />;
    case 'bits':
      return <Bits node={node} />;
    case 'bars':
      return <Bars node={node} />;
    case 'marks':
      return <Marks node={node} />;
    case 'chiprows':
      return <ChipRows node={node} />;
    case 'logbars':
      return <LogBars node={node} />;
    case 'caption':
      return <Caption node={node} />;
    case 'problem':
      return <Problem node={node} />;
    case 'codelines':
      return <CodeLines node={node} />;
    case 'panel':
      return (
        <Labelled label={node.label}>
          <div className="flex flex-col gap-2">
            <VizNodes nodes={node.children} />
          </div>
        </Labelled>
      );
    case 'row': {
      const layout =
        node.direction === 'column'
          ? 'flex-col gap-2.5'
          : `flex-wrap ${node.gap === 'wide' ? 'gap-7' : 'gap-[18px]'} ${node.align === 'end' ? 'items-end' : 'items-start'}`;
      return (
        <div className={`flex min-w-0 ${layout}`}>
          <VizNodes nodes={node.children} />
        </div>
      );
    }
  }
}

/**
 * The nodes of one view. They are keyed by position and kind, so from one step to the next React updates the same
 * elements and their states change with a transition instead of being redrawn.
 */
export function VizNodes({ nodes }: { nodes: readonly VizNode[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <VizNodeView key={`${i}-${n.kind}`} node={n} />
      ))}
    </>
  );
}
