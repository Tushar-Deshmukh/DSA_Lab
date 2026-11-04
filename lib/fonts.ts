import { IBM_Plex_Sans, JetBrains_Mono, Literata } from 'next/font/google';

// next/font downloads the files at build time and serves them from this origin, so browsers never contact Google.
const reading = Literata({ subsets: ['latin'], variable: '--nf-reading', display: 'swap' });
const ui = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--nf-ui',
  display: 'swap',
});
const code = JetBrains_Mono({ subsets: ['latin'], variable: '--nf-code', display: 'swap' });

export const fontVariables = [reading.variable, ui.variable, code.variable].join(' ');
