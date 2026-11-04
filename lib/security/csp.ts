// Content Security Policy (decisions D-006 and D-007).
// Pages: the header keeps 'unsafe-inline' only as a floor. scripts/csp-hashes.mjs adds a <meta> policy to every
// prerendered page that lists the SHA-256 of exactly that page's inline scripts; browsers enforce both policies,
// so only those scripts run. The runner Worker is served with its own policy: eval allowed, no network.

export function pagePolicy({ dev }: { dev: boolean }): string {
  return [
    "default-src 'self'",
    // React needs eval in development only.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // Hot reload uses a WebSocket in development.
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}

export const RUNNER_POLICY = "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'";

export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Browsers ignore this header on plain-HTTP responses, so it is safe locally.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];
