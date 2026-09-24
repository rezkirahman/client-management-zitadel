import {
  generateTimestamp,
  generateSignature,
  getSignaturePayload,
  generateCurlCommand,
  buildCanonicalQueryString,
  isSignatureRequired,
} from "../src/lib/agforce-client";
import assert from "assert";
import crypto from "crypto";

console.log("Running AGForce client utility tests (Final Integration Guide)...");

// Test 1: Timestamp format is 14 digits YYYYMMDDHHmmss
const now = new Date("2026-09-24T10:15:00Z");
const ts = generateTimestamp(now);
assert.strictEqual(ts.length, 14, "Timestamp length must be exactly 14 characters");
assert.match(ts, /^\d{14}$/, "Timestamp must contain only digits");

// Test 2: Canonical query string sorting & encoding
const query = { b: "2", a: "1", c: "hello world" };
const canonical = buildCanonicalQueryString(query);
assert.strictEqual(canonical, "a=1&b=2&c=hello%20world", "Query string must be sorted alphabetically and encoded");

// Test 3: Formula and raw signature payload with newline separator
const params = {
  source: "client_management",
  timestamp: "20260924101500",
  rawBody: "",
  endpointPath: "/api/v1/hierarchy",
  queryParams: {},
  secretKey: "your_secret_key_here",
  method: "GET",
};

const payload = getSignaturePayload(params);
const expectedPayload = [
  "GET",
  "/api/v1/hierarchy",
  "",
  "20260924101500",
  "client_management",
  "",
].join("\n");
assert.strictEqual(payload, expectedPayload, "Signature payload newline format mismatch");

// Test 4: HMAC-SHA256 calculation matches crypto.createHmac
const expectedHmac = crypto.createHmac("sha256", params.secretKey).update(payload, "utf8").digest("hex");
const generatedHmac = generateSignature(params);
assert.strictEqual(generatedHmac, expectedHmac, "HMAC-SHA256 calculation mismatch");

// Test 5: Tier requirement check
assert.strictEqual(isSignatureRequired("/api/v1/me"), false, "/api/v1/me must not require signature");
assert.strictEqual(isSignatureRequired("/api/v1/hierarchy"), true, "/api/v1/hierarchy must require signature");

// Test 6: cURL command generator without signature (for /me) and with signature (for /hierarchy)
const curlMe = generateCurlCommand({
  baseUrl: "https://api.agforce.co.id",
  endpointPath: "/api/v1/me",
  method: "GET",
  source: "client_management",
  timestamp: "20260924101500",
  token: "test_token_123",
});
assert.ok(!curlMe.includes("X-Signature"), "/api/v1/me curl must not include X-Signature");

const curlHierarchy = generateCurlCommand({
  baseUrl: "https://api.agforce.co.id",
  endpointPath: "/api/v1/hierarchy",
  method: "GET",
  source: "client_management",
  timestamp: "20260924101500",
  signature: generatedHmac,
  token: "test_token_123",
});
assert.ok(curlHierarchy.includes(`-H "X-Signature: ${generatedHmac}"`), "/api/v1/hierarchy curl must include X-Signature");

console.log("✓ All AGForce client utility tests passed successfully!");
