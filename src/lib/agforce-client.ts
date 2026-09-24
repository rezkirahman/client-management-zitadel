import crypto from "crypto";

export interface SignatureParams {
  source: string;
  timestamp: string;
  rawBody?: string;
  endpointPath: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
  secretKey: string;
  method: string;
}

export interface CurlParams {
  baseUrl: string;
  endpointPath: string;
  method: string;
  source: string;
  timestamp: string;
  signature?: string;
  token?: string;
  rawBody?: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
}

/**
 * Generate timestamp in format YYYYMMDDHHmmss (14 digits)
 */
export function generateTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Builds canonical query string:
 * Parameters sorted alphabetically by key and joined with &
 */
export function buildCanonicalQueryString(
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort();
  if (keys.length === 0) return "";
  return keys.map((k) => `${k}=${encodeURIComponent(String(params[k]))}`).join("&");
}

/**
 * Generate raw newline-delimited payload string before hashing
 * Format:
 * METHOD
 * endpointPath
 * canonicalQueryString
 * timestamp
 * source
 * rawBody
 */
export function getSignaturePayload(params: SignatureParams): string {
  const method = (params.method || "GET").toUpperCase();
  const endpointPath = params.endpointPath || "";
  const canonicalQueryString = buildCanonicalQueryString(params.queryParams || {});
  const timestamp = params.timestamp || "";
  const source = params.source || "";
  const rawBody = params.rawBody || "";

  return [method, endpointPath, canonicalQueryString, timestamp, source, rawBody].join("\n");
}

/**
 * Calculate HMAC-SHA256 signature in hexadecimal format
 * Formula: HMAC-SHA256(secret_key, payload)
 */
export function generateSignature(params: SignatureParams): string {
  const payload = getSignaturePayload(params);
  return crypto.createHmac("sha256", params.secretKey).update(payload, "utf8").digest("hex");
}

/**
 * Checks whether an endpoint requires X-Signature based on AGForce API Tier:
 * - /api/v1/me -> Tier 1 (Bearer + X-Source + X-Timestamp, NO X-Signature)
 * - /api/v1/hierarchy -> Tier 2 (Wajib X-Signature HMAC-SHA256)
 */
export function isSignatureRequired(endpointPath: string): boolean {
  const clean = endpointPath.split("?")[0].trim().toLowerCase();
  if (clean === "/api/v1/me") {
    return false;
  }
  return true;
}

/**
 * Generate ready-to-run cURL command for debugging/terminal use
 */
export function generateCurlCommand(params: CurlParams): string {
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const cleanPath = params.endpointPath.startsWith("/") ? params.endpointPath : `/${params.endpointPath}`;
  const canonicalQuery = buildCanonicalQueryString(params.queryParams || {});
  const querySuffix = canonicalQuery ? `?${canonicalQuery}` : "";
  const fullUrl = `${cleanBase}${cleanPath}${querySuffix}`;
  const method = (params.method || "GET").toUpperCase();

  const lines = [
    `curl -X ${method} "${fullUrl}"`,
    `  -H "Authorization: Bearer ${params.token || "<ZITADEL_ACCESS_TOKEN>"}"`,
    `  -H "X-Source: ${params.source}"`,
    `  -H "X-Timestamp: ${params.timestamp}"`,
  ];

  if (params.signature) {
    lines.push(`  -H "X-Signature: ${params.signature}"`);
  }

  lines.push(`  -H "Content-Type: application/json"`);

  if (params.rawBody && method !== "GET") {
    lines.push(`  -d '${params.rawBody.replace(/'/g, "'\\''")}'`);
  }

  return lines.join(" \\\n");
}
