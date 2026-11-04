'use client';
import { useEffect, useState } from 'react';
export function Island() { const [v, set] = useState('server'); useEffect(() => set('hydrated'), []); return <p id="state">{v}</p>; }
