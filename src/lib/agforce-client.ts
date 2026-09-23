import crypto from "crypto";

export interface SignatureParams {
  source: string;
  timestamp: string;
  rawBody?: string;
  endpointPath: string;
  secretKey: string;
  method: string;
}

export interface CurlParams {
  baseUrl: string;
  endpointPath: string;
  method: string;
  source: string;
  timestamp: string;
  signature: string;
  token?: string;
  rawBody?: string;
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
 * Generate raw concatenated string payload before hashing
 * Formula: source + timestamp + rawBody + endpointPath + secret_key + METHOD
 */
export function getSignaturePayload(params: SignatureParams): string {
  const source = params.source || "";
  const timestamp = params.timestamp || "";
  const rawBody = params.rawBody || "";
  const endpointPath = params.endpointPath || "";
  const secretKey = params.secretKey || "";
  const method = (params.method || "GET").toUpperCase();

  return source + timestamp + rawBody + endpointPath + secretKey + method;
}

/**
 * Calculate HMAC/SHA-256 signature in hexadecimal format
 */
export function generateSignature(params: SignatureParams): string {
  const payload = getSignaturePayload(params);
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Generate ready-to-run cURL command for debugging/terminal use
 */
export function generateCurlCommand(params: CurlParams): string {
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const cleanPath = params.endpointPath.startsWith("/") ? params.endpointPath : `/${params.endpointPath}`;
  const fullUrl = `${cleanBase}${cleanPath}`;
  const method = params.method.toUpperCase();

  const lines = [
    `curl -X ${method} "${fullUrl}"`,
    `  -H "Authorization: Bearer ${params.token || "<ZITADEL_ACCESS_TOKEN>"}"`,
    `  -H "X-Source: ${params.source}"`,
    `  -H "X-Timestamp: ${params.timestamp}"`,
    `  -H "X-Signature: ${params.signature}"`,
    `  -H "Content-Type: application/json"`,
  ];

  if (params.rawBody && method !== "GET") {
    lines.push(`  -d '${params.rawBody.replace(/'/g, "'\\''")}'`);
  }

  return lines.join(" \\\n");
}
