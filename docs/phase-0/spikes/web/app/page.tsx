import Link from 'next/link';
import { Island } from './island';
export default function Page() { return <main><h1>Static lesson page</h1><Island /><Link id="nav" href="/about">about</Link></main>; }
