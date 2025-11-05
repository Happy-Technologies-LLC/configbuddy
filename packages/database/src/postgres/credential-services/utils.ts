/**
 * Utility functions for credential affinity matching
 */

import { logger } from '@cmdb/common';

/**
 * Check if an IP address is within a CIDR range
 * Supports IPv4 only (basic implementation)
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [cidrIp, prefixLength] = cidr.split('/');
    if (!cidrIp || !prefixLength) {
      return false;
    }

    const prefix = parseInt(prefixLength, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipInt = ipToInt(ip);
    const cidrIpInt = ipToInt(cidrIp);

    // Create subnet mask
    const mask = prefix === 0 ? 0 : -1 << (32 - prefix);

    return (ipInt & mask) === (cidrIpInt & mask);
  } catch (error) {
    logger.error('Failed to match CIDR', { ip, cidr, error });
    return false;
  }
}

/**
 * Convert IPv4 address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
  const p0 = parts[0] ?? 0;
  const p1 = parts[1] ?? 0;
  const p2 = parts[2] ?? 0;
  const p3 = parts[3] ?? 0;
  return (
    (p0 << 24) | (p1 << 16) | (p2 << 8) | p3
  ) >>> 0;
}

/**
 * Match hostname against glob pattern
 * Supports * (any characters) and ? (single character)
 */
export function matchGlob(hostname: string, pattern: string): boolean {
  try {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case-insensitive
    return regex.test(hostname);
  } catch (error) {
    logger.error('Failed to match glob pattern', { hostname, pattern, error });
    return false;
  }
}
