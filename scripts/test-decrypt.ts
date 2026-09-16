import crypto from "crypto";

/**
 * Mendekripsi ciphertext PIN AES-256-GCM dari format Golang:
 * Format ciphertext (hex): [12-byte Nonce] + [Ciphertext] + [16-byte Auth Tag]
 * Key: salt_pin (32 karakter UTF-8 = 32 byte)
 */
export function decryptAgforcePin(pinHex: string, saltPin: string): string {
  if (!pinHex || !saltPin) {
    throw new Error("pinHex and saltPin must not be empty");
  }

  const raw = Buffer.from(pinHex.trim(), "hex");
  const key = Buffer.from(saltPin.trim(), "utf-8");

  if (key.length !== 32) {
    throw new Error(`Invalid salt key length: expected 32 bytes, got ${key.length}`);
  }

  const NONCE_LENGTH = 12; // Standard GCM nonce in Golang
  const TAG_LENGTH = 16;   // Standard GCM auth tag in Golang

  if (raw.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error(`Ciphertext too short: ${raw.length} bytes`);
  }

  const nonce = raw.subarray(0, NONCE_LENGTH);
  const authTag = raw.subarray(raw.length - TAG_LENGTH);
  const ciphertext = raw.subarray(NONCE_LENGTH, raw.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Fungsi simulasi enkripsi persis seperti yang dilakukan di Golang:
 * gcm.Seal(nonce, nonce, []byte(pin), nil)
 */
export function simulateGolangEncrypt(pin: string, salt: string): string {
  const key = Buffer.from(salt, "utf-8");
  const nonce = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(pin, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Golang gcm.Seal(nonce, nonce, plaintext, nil) hasilnya: [nonce 12b] + [ciphertext] + [tag 16b]
  const combined = Buffer.concat([nonce, ciphertext, tag]);
  return combined.toString("hex");
}

// Test Runner
function runTest() {
  console.log("=== Testing AES-256-GCM Pin Decryption (Golang Compat) ===");

  const testPin = "123456";
  const testSalt = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"; // 32 characters

  console.log(`Original PIN : ${testPin}`);
  console.log(`Salt (Key)   : ${testSalt} (${Buffer.from(testSalt).length} bytes)`);

  const hexCipher = simulateGolangEncrypt(testPin, testSalt);
  console.log(`Simulated Hex: ${hexCipher} (${hexCipher.length / 2} bytes)`);

  try {
    const recoveredPin = decryptAgforcePin(hexCipher, testSalt);
    console.log(`Recovered PIN: ${recoveredPin}`);

    if (recoveredPin === testPin) {
      console.log("✅ SUCCESS: Decryption matches original PIN perfectly!");
    } else {
      console.error("❌ FAILED: Decrypted PIN does not match original!");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ ERROR during decryption:", err);
    process.exit(1);
  }
}

if ((import.meta as any).main || process.argv[1]?.endsWith("test-decrypt.ts")) {
  runTest();
}
