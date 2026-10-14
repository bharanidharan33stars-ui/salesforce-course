import { env, isProd } from "../config/env";

/**
 * Request origin allow-list.
 *
 * Always allowed: the configured frontend URL and the API's own base URL.
 *
 * In development we additionally allow loopback addresses (localhost on any
 * port) and private-network addresses (10.x, 192.168.x, 172.16-31.x). That is
 * exactly what lets a phone on the same Wi-Fi open the site served by this PC
 * while keeping the internet at large excluded. Production only ever allows
 * the configured URLs.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  const [a, b] = octets;
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function normalise(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function configuredOrigins(): string[] {
  return [env.FRONTEND_URL, env.APP_BASE_URL].filter(Boolean).map(normalise);
}

export function isOriginAllowed(origin: string): boolean {
  if (!origin || origin === "null") return false;
  if (configuredOrigins().includes(origin)) return true;
  if (isProd) return false;

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname;
    return LOOPBACK.has(hostname) || isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}
