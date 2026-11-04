import { Island } from '../island';
// A lesson-sized static page: about 30 KB of server-rendered text, the largest legacy lesson.
const para = 'Two pointers walk towards each other because sorted order tells you which side can still help. '.repeat(3);
export default function Big() { return <main><Island />{Array.from({ length: 100 }, (_, i) => <p key={i}>{i} {para}</p>)}</main>; }
