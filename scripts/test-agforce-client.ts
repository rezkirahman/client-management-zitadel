import { generateTimestamp, generateSignature, getSignaturePayload, generateCurlCommand } from "../src/lib/agforce-client";
import assert from "assert";
import crypto from "crypto";

console.log("Running AGForce client utility tests...");

// Test 1: Timestamp format is 14 digits YYYYMMDDHHmmss
const now = new Date("2026-09-22T17:30:00Z");
const ts = generateTimestamp(now);
assert.strictEqual(ts.length, 14, "Timestamp length must be exactly 14 characters");
assert.match(ts, /^\d{14}$/, "Timestamp must contain only digits");

// Test 2: Formula and raw signature payload concatenation
const params = {
  source: "client_management",
  timestamp: "20260922173000",
  rawBody: "",
  endpointPath: "/api/v1/me",
  secretKey: "sec_cb724b2440262b7c04f805d7e806cab1",
  method: "GET",
};

const payload = getSignaturePayload(params);
const expectedPayload = "client_management20260922173000/api/v1/mesec_cb724b2440262b7c04f805d7e806cab1GET";
assert.strictEqual(payload, expectedPayload, "Signature payload concatenation mismatch");

// Test 3: SHA256 matches crypto digest
const expectedHash = crypto.createHash("sha256").update(expectedPayload, "utf8").digest("hex");
const generatedHash = generateSignature(params);
assert.strictEqual(generatedHash, expectedHash, "Signature hash calculation mismatch");

// Test 4: cURL generator output
const curl = generateCurlCommand({
  baseUrl: "http://localhost:8080",
  endpointPath: "/api/v1/me",
  method: "GET",
  source: params.source,
  timestamp: params.timestamp,
  signature: generatedHash,
  token: "test_token_123",
});
assert.ok(curl.includes("curl -X GET \"http://localhost:8080/api/v1/me\""), "cURL URL missing");
assert.ok(curl.includes("-H \"Authorization: Bearer test_token_123\""), "cURL Bearer missing");
assert.ok(curl.includes(`-H \"X-Signature: ${generatedHash}\"`), "cURL Signature missing");

console.log("✓ All AGForce client utility tests passed successfully!");
