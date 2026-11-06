import type { NextConfig } from 'next';
import { pagePolicy, RUNNER_POLICY, SECURITY_HEADERS } from './lib/security/csp';

const dev = process.env.NODE_ENV === 'development';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The route handlers read the generated server bundle at runtime (D-011): without this, a serverless
  // deployment would not trace .generated/ into its lambda. prebuild produces the files.
  outputFileTracingIncludes: { '/api/**': ['./.generated/**'] },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        source: '/((?!runner/).*)',
        headers: [{ key: 'Content-Security-Policy', value: pagePolicy({ dev }) }],
      },
      {
        source: '/runner/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: RUNNER_POLICY },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default config;
