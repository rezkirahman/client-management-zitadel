import fs from "fs";
import path from "path";
import { decryptAgforcePin } from "./test-decrypt";

const TARGET_FILE = process.argv[2] || process.env.AUDIT_FILE || path.resolve(process.cwd(), "query_results.json");

interface UserRecord {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  pin?: string;
  salt_pin?: string;
  gender?: string;
  nik?: string;
  id_karyawan?: string;
  branchs?: string;
  deleted_at?: string | null;
  disabled_account?: boolean | null;
  zitadel_id?: string | null;
  [key: string]: any;
}

function normalizePhone(p: string): string {
  let cleaned = p.trim().replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+62")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("62") && !cleaned.startsWith("+")) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

function runAudit() {
  console.log(`🔍 Auditing file: ${TARGET_FILE}`);
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ File does not exist: ${TARGET_FILE}`);
    process.exit(1);
  }

  const stat = fs.statSync(TARGET_FILE);
  console.log(`📁 File Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)`);
  console.log(`🕒 Last Modified: ${stat.mtime.toISOString()}`);

  const raw = fs.readFileSync(TARGET_FILE, "utf-8");
  let data: UserRecord[] = [];

  try {
    data = JSON.parse(raw);
  } catch (e: any) {
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      data.push(JSON.parse(line));
    }
  }

  console.log(`📊 Total records parsed: ${data.length}`);

  if (data.length === 0) {
    console.log("Empty data file.");
    return;
  }

  const allKeys = new Set<string>();
  data.slice(0, 100).forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));
  console.log(`🔑 Schema keys found:`, Array.from(allKeys).join(", "));

  let countDeleted = 0;
  let countDisabled = 0;
  let countNoPhone = 0;
  let countNoPinOrSalt = 0;
  let countAlreadyHasZitadelId = 0;

  let countDecryptSuccess = 0;
  let countDecryptFail = 0;
  let countNon6Digit = 0;

  const phoneMap = new Map<string, number[]>();
  const decryptErrors: Array<{ id: any; phone: any; name: any; reason: string }> = [];
  const non6DigitPins: Array<{ id: any; phone: any; pin: string }> = [];

  let countValidEmail = 0;
  let countNullEmail = 0;
  let countInvalidEmailFormat = 0;

  let countNik = 0;
  let countIdKaryawan = 0;
  let countBranchs = 0;

  for (let i = 0; i < data.length; i++) {
    const u = data[i];

    if (u.deleted_at) {
      countDeleted++;
      continue;
    }

    if (u.disabled_account === true) {
      countDisabled++;
      continue;
    }

    if (u.zitadel_id) {
      countAlreadyHasZitadelId++;
    }

    const phoneRaw = u.phone ? String(u.phone).trim() : "";
    if (!phoneRaw) {
      countNoPhone++;
      continue;
    }

    const normalized = normalizePhone(phoneRaw);
    if (!phoneMap.has(normalized)) {
      phoneMap.set(normalized, []);
    }
    phoneMap.get(normalized)!.push(Number(u.id));

    if (u.nik) countNik++;
    if (u.id_karyawan) countIdKaryawan++;
    if (u.branchs) countBranchs++;

    const email = u.email ? String(u.email).trim() : "";
    if (!email || email.toLowerCase() === "null") {
      countNullEmail++;
    } else if (!email.includes("@") || email.startsWith("-") || !email.includes(".")) {
      countInvalidEmailFormat++;
    } else {
      countValidEmail++;
    }

    const pinHex = u.pin ? String(u.pin).trim() : "";
    const salt = u.salt_pin ? String(u.salt_pin).trim() : "";

    if (!pinHex || !salt) {
      countNoPinOrSalt++;
      continue;
    }

    try {
      const decryptedPin = decryptAgforcePin(pinHex, salt);
      countDecryptSuccess++;
      if (!/^\d{6}$/.test(decryptedPin)) {
        countNon6Digit++;
        non6DigitPins.push({ id: u.id, phone: phoneRaw, pin: decryptedPin });
      }
    } catch (err: any) {
      countDecryptFail++;
      decryptErrors.push({ id: u.id, phone: phoneRaw, name: `${u.firstname || ""} ${u.lastname || ""}`.trim(), reason: err.message });
    }
  }

  const duplicatePhones: Array<{ phone: string; count: number; ids: any[] }> = [];
  phoneMap.forEach((ids, phone) => {
    if (ids.length > 1) {
      duplicatePhones.push({ phone, count: ids.length, ids });
    }
  });

  console.log("\n=======================================================");
  console.log("                  AUDIT SUMMARY REPORT                 ");
  console.log("=======================================================");
  console.log(`Total Records in File                   : ${data.length}`);
  console.log(`- Soft-deleted (deleted_at IS NOT NULL) : ${countDeleted}`);
  console.log(`- Disabled accounts (disabled_account)  : ${countDisabled}`);
  console.log(`- Missing/empty Phone                   : ${countNoPhone}`);
  console.log(`- Missing/empty PIN or Salt             : ${countNoPinOrSalt}`);
  console.log(`- Already have zitadel_id               : ${countAlreadyHasZitadelId}`);
  console.log(`- Unique normalized phone numbers       : ${phoneMap.size}`);
  console.log(`- Duplicate phone numbers               : ${duplicatePhones.length}`);

  console.log("\n--- PIN Decryption Verification ---");
  console.log(`- Successfully decrypted PINs           : ${countDecryptSuccess}`);
  console.log(`- Decryption failures                   : ${countDecryptFail}`);
  console.log(`- Decrypted PINs not 6 digits           : ${countNon6Digit}`);

  if (decryptErrors.length > 0) {
    console.log(`\n⚠️ Decryption Failures Detail (${decryptErrors.length}):`);
    console.table(decryptErrors);
  }

  if (non6DigitPins.length > 0) {
    console.log(`\n⚠️ Non-6-digit PINs Detail (${non6DigitPins.length}):`);
    console.table(non6DigitPins.slice(0, 10));
  }

  if (duplicatePhones.length > 0) {
    console.log(`\n⚠️ Duplicate Phone Sample:`);
    console.table(duplicatePhones.slice(0, 10));
  }

  console.log("\n--- Metadata & Email Breakdown ---");
  console.log(`- Valid Emails                          : ${countValidEmail}`);
  console.log(`- Null / Empty Emails                   : ${countNullEmail} (will use fallback @agforce.internal)`);
  console.log(`- Invalid Format Emails (e.g. -@..)     : ${countInvalidEmailFormat} (will use fallback @agforce.internal)`);
  console.log(`- Records with NIK                      : ${countNik}`);
  console.log(`- Records with ID Karyawan              : ${countIdKaryawan}`);
  console.log(`- Records with Branchs                  : ${countBranchs}`);

  console.log("\n--- Sample First 3 Records ---");
  console.log(JSON.stringify(data.slice(0, 3), null, 2));

  console.log("\n--- Sample Last 3 Records ---");
  console.log(JSON.stringify(data.slice(-3), null, 2));
}

runAudit();
