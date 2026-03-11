/**
 * Validates that a URL is safe to fetch server-side (prevents SSRF attacks).
 * Blocks private IP ranges, localhost, and cloud metadata endpoints.
 */

// Private/reserved IP ranges that must be blocked
const BLOCKED_IP_PATTERNS = [
  /^127\./,                          // 127.0.0.0/8 (loopback)
  /^10\./,                           // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
  /^192\.168\./,                     // 192.168.0.0/16
  /^169\.254\./,                     // 169.254.0.0/16 (link-local, AWS metadata)
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  /^::1$/,                           // IPv6 loopback
  /^fc00:/i,                         // IPv6 unique local
  /^fd/i,                            // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0',
  '[::1]',
];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

export function validateExternalUrl(url: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Malformed URL' };
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http and https URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, error: 'Access to internal/local hosts is not allowed' };
  }

  // Block IP address literals in private ranges
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Access to private/internal IP ranges is not allowed' };
    }
  }

  // Block bare IPv4 that resolves to metadata (e.g. decimal encoding of 169.254.169.254)
  if (/^\d+$/.test(hostname)) {
    // Single decimal number like 2852039166 = 169.254.169.254
    return { valid: false, error: 'Numeric IP addresses are not allowed' };
  }

  // Block IPv6 bracket notation
  if (hostname.startsWith('[')) {
    return { valid: false, error: 'IPv6 addresses are not allowed in URLs' };
  }

  // Block URLs with credentials
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }

  return { valid: true };
}
