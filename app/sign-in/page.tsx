import type { Metadata } from 'next';
import { signInOptions } from '@/lib/env';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return <SignInForm {...signInOptions()} />;
}
