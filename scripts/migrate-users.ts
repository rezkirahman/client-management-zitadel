import fs from "fs";
import path from "path";
import readline from "readline";
import crypto from "crypto";
import { decryptAgforcePin } from "./test-decrypt";

// Load .env.local if exists
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
const ZITADEL_PAT =
  process.env.ZITADEL_PAT ||
  "eyJhbGciOiJBMjU2R0NNS1ciLCJlbmMiOiJBMjU2R0NNIiwiaXYiOiJjam5hRkJCSTJkRTF3Z3FOIiwia2lkIjoib2lkY0tleSIsInRhZyI6IkhQaW9EcWU4U2RXM2JPUm03ai10eUEifQ.BZy-OcwxyR1hKYGBBvSu-bssdX9K0677ZIdI4be1Sbg.qyj8EOvf-WxeFPGe.o-MUImIiAGGdtvwPH44oz3bNrGBAVEl441Zfpjf6_6hTOQtpdA.gKiM-juOI9lXyMB13YXLLA";

interface UserRecord {
  legacyId?: string;
  firstname: string;
  lastname: string;
  phone: string;
  pin: string;
  salt_pin: string;
  email?: string;
  gender?: string;
  nik?: string;
  idKaryawan?: string;
  branchs?: string;
  deletedAt?: string;
  disabledAccount?: string;
  rawLineIndex: number;
}

interface ProgressState {
  completedPhones: string[];
  totalSuccess: number;
  totalFailed: number;
  lastUpdated: string;
}

const PROGRESS_FILE = path.resolve(process.cwd(), "migration-progress.json");
const FAILED_FILE = path.resolve(process.cwd(), "migration-failed.csv");

function parseArgs() {
  const args = process.argv.slice(2);
  let file = "sample-users.csv.example";
  let concurrency = 10;
  let batchDelayMs = 250;
  let isDryRun = false;
  let resume = true;

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      file = arg.split("=")[1];
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parseInt(arg.split("=")[1], 10) || 10;
    } else if (arg.startsWith("--delay=")) {
      batchDelayMs = parseInt(arg.split("=")[1], 10) || 250;
    } else if (arg === "--dry-run") {
      isDryRun = true;
    } else if (arg === "--no-resume" || arg === "--reset") {
      resume = false;
    }
  }

  return { file, concurrency, batchDelayMs, isDryRun, resume };
}

function loadProgress(resume: boolean): ProgressState {
  if (resume && fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
      return {
        completedPhones: data.completedPhones || [],
        totalSuccess: data.totalSuccess || 0,
        totalFailed: data.totalFailed || 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      // ignore
    }
  }
  return {
    completedPhones: [],
    totalSuccess: 0,
    totalFailed: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function saveProgress(state: ProgressState) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function appendFailedRecord(record: UserRecord, reason: string) {
  if (!fs.existsSync(FAILED_FILE)) {
    fs.writeFileSync(FAILED_FILE, "line,name,phone,reason\n", "utf-8");
  }
  const cleanReason = reason.replace(/[\r\n,]/g, " ");
  const displayName = `${record.firstname} ${record.lastname}`.trim() || "Unknown";
  fs.appendFileSync(FAILED_FILE, `${record.rawLineIndex},"${displayName}","${record.phone}","${cleanReason}"\n`, "utf-8");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizePhone(rawPhone: string): { username: string; e164: string } {
  let cleaned = rawPhone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  let username = cleaned;
  let e164 = "";

  if (cleaned.startsWith("62")) {
    username = "0" + cleaned.substring(2);
    e164 = "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    e164 = "+62" + cleaned.substring(1);
  } else {
    username = "0" + cleaned;
    e164 = "+62" + cleaned;
  }

  return { username, e164 };
}

function normalizeGender(rawGender?: string): "GENDER_MALE" | "GENDER_FEMALE" | "GENDER_UNSPECIFIED" {
  if (!rawGender) return "GENDER_UNSPECIFIED";
  const g = rawGender.trim().toLowerCase();
  if (g === "m" || g === "l" || g === "male" || g === "laki-laki" || g === "pria") {
    return "GENDER_MALE";
  }
  if (g === "f" || g === "p" || g === "female" || g === "perempuan" || g === "wanita") {
    return "GENDER_FEMALE";
  }
  return "GENDER_UNSPECIFIED";
}

async function setZitadelUserMetadata(userId: string, key: string, value: string) {
  try {
    await fetch(`${ZITADEL_ISSUER}/management/v1/users/${userId}/metadata/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify({
        value: Buffer.from(value).toString("base64"),
      }),
    });
  } catch {
    // Non-blocking
  }
}

async function createZitadelUser(record: UserRecord, isDryRun: boolean): Promise<{ success: boolean; error?: string }> {
  // 1. Decrypt PIN
  let decryptedPin: string;
  try {
    decryptedPin = decryptAgforcePin(record.pin, record.salt_pin);
  } catch (err: any) {
    return { success: false, error: `Decryption failed: ${err.message}` };
  }

  if (!decryptedPin || decryptedPin.length < 6) {
    return { success: false, error: `Invalid decrypted PIN length: ${decryptedPin?.length || 0} chars` };
  }

  const { username, e164 } = normalizePhone(record.phone);
  const givenName = record.firstname.trim() || "User";
  const familyName = record.lastname.trim() || givenName;
  const displayName = `${givenName} ${record.lastname.trim()}`.trim();
  const email = record.email && record.email.includes("@") ? record.email.trim() : `${username}@agforce.internal`;
  const gender = normalizeGender(record.gender);

  if (isDryRun) {
    return { success: true };
  }

  // 2. Call ZITADEL API
  const payload = {
    username,
    profile: {
      givenName,
      familyName,
      displayName,
      gender,
    },
    email: {
      email,
      isVerified: true,
    },
    phone: {
      phone: e164,
      isVerified: true,
    },
    password: {
      password: decryptedPin,
    },
  };

  try {
    const res = await fetch(`${ZITADEL_ISSUER}/v2/users/human`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes("already exists") || res.status === 409) {
        return { success: true };
      }
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const userId = data.userId || data.id;

    // 3. Save User Metadata (NIK, ID Karyawan, Cabang, Legacy DB ID)
    if (userId) {
      const metadataPromises: Promise<void>[] = [];
      if (record.legacyId) metadataPromises.push(setZitadelUserMetadata(userId, "legacy_user_id", record.legacyId));
      if (record.nik) metadataPromises.push(setZitadelUserMetadata(userId, "nik", record.nik));
      if (record.idKaryawan) metadataPromises.push(setZitadelUserMetadata(userId, "id_karyawan", record.idKaryawan));
      if (record.branchs) metadataPromises.push(setZitadelUserMetadata(userId, "branchs", record.branchs));

      if (metadataPromises.length > 0) {
        await Promise.allSettled(metadataPromises);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

async function main() {
  const { file, concurrency, batchDelayMs, isDryRun, resume } = parseArgs();
  const filePath = path.resolve(process.cwd(), file);

  console.log("=================================================");
  console.log("       AGFORCE SSO USER MIGRATION TOOL           ");
  console.log("=================================================");
  console.log(`Target File      : ${filePath}`);
  console.log(`ZITADEL Issuer   : ${ZITADEL_ISSUER}`);
  console.log(`Mode             : ${isDryRun ? "DRY RUN (No API calls)" : "LIVE MIGRATION"}`);
  console.log(`Concurrency      : ${concurrency}`);
  console.log(`Batch Delay      : ${batchDelayMs} ms`);
  console.log(`Resume Checkpoint: ${resume ? "Enabled" : "Disabled"}`);
  console.log("-------------------------------------------------\n");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File ${filePath} not found!`);
    console.log("💡 Tip: Copy sample-users.csv.example to your own CSV file.");
    process.exit(1);
  }

  const progress = loadProgress(resume);
  const completedSet = new Set(progress.completedPhones);

  if (completedSet.size > 0) {
    console.log(`ℹ️ Resuming session: ${completedSet.size} users already processed previously.\n`);
  }

  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  let headerMap: Record<string, number> = {};
  const records: UserRecord[] = [];
  let lineCount = 0;
  let skippedDeleted = 0;
  let skippedDisabled = 0;
  let skippedNoPin = 0;

  for await (const line of rl) {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = parseCsvLine(trimmed);

    if (isHeader) {
      isHeader = false;
      parts.forEach((col, idx) => {
        const cleanCol = col.toLowerCase().replace(/[\s_-]/g, "");
        headerMap[cleanCol] = idx;
      });

      const hasPhone = "phone" in headerMap || "nohp" in headerMap || "telepon" in headerMap;
      const hasPin = "pin" in headerMap || "tokenpin" in headerMap;
      const hasSalt = "saltpin" in headerMap || "salt" in headerMap;

      if (!hasPhone || !hasPin || !hasSalt) {
        console.error("❌ CSV Header format error! Missing required columns (phone, pin, salt_pin).");
        console.error("Found columns:", Object.keys(headerMap).join(", "));
        process.exit(1);
      }
      continue;
    }

    const getVal = (keys: string[]): string => {
      for (const k of keys) {
        if (k in headerMap && parts[headerMap[k]] !== undefined) {
          const v = parts[headerMap[k]].trim();
          if (v && v.toLowerCase() !== "null") return v;
        }
      }
      return "";
    };

    const deletedAt = getVal(["deletedat", "deleted_at"]);
    const disabledAccount = getVal(["disabledaccount", "disabled_account", "disabled"]);

    // Safeguards: Soft delete & disabled accounts
    if (deletedAt) {
      skippedDeleted++;
      continue;
    }
    if (disabledAccount === "true" || disabledAccount === "1" || disabledAccount === "t") {
      skippedDisabled++;
      continue;
    }

    const phone = getVal(["phone", "nohp", "handphone", "telepon"]);
    const pin = getVal(["pin", "tokenpin"]);
    const salt_pin = getVal(["saltpin", "salt"]);

    if (!phone || !pin || !salt_pin) {
      skippedNoPin++;
      continue;
    }

    let firstname = getVal(["firstname", "namadepan"]);
    let lastname = getVal(["lastname", "namabelakang"]);
    const fallbackName = getVal(["name", "nama", "fullname"]);

    if (!firstname && fallbackName) {
      const nameParts = fallbackName.split(" ");
      firstname = nameParts[0] || "User";
      lastname = nameParts.slice(1).join(" ");
    }

    const legacyId = getVal(["id", "userid", "user_id"]);
    const email = getVal(["email"]);
    const gender = getVal(["gender", "jeniskelamin"]);
    const nik = getVal(["nik"]);
    const idKaryawan = getVal(["idkaryawan", "id_karyawan"]);
    const branchs = getVal(["branchs", "branch", "cabang"]);

    records.push({
      legacyId,
      firstname: firstname || "User",
      lastname,
      phone,
      pin,
      salt_pin,
      email,
      gender,
      nik,
      idKaryawan,
      branchs,
      rawLineIndex: lineCount,
    });
  }

  console.log(`📊 Loaded ${records.length} valid user records from CSV.`);
  if (skippedDeleted > 0) console.log(`⏩ Skipped ${skippedDeleted} soft-deleted users (deleted_at).`);
  if (skippedDisabled > 0) console.log(`⏩ Skipped ${skippedDisabled} disabled users (disabled_account).`);
  if (skippedNoPin > 0) console.log(`⏩ Skipped ${skippedNoPin} records with empty PIN/phone.`);

  const pendingRecords = records.filter((r) => !completedSet.has(r.phone.trim()));
  console.log(`🚀 Remaining users to process: ${pendingRecords.length}\n`);

  if (pendingRecords.length === 0) {
    console.log("✅ All users have already been migrated according to migration-progress.json!");
    process.exit(0);
  }

  const startTime = Date.now();
  let processedInSession = 0;
  let sessionSuccess = 0;
  let sessionFailed = 0;

  for (let i = 0; i < pendingRecords.length; i += concurrency) {
    const batch = pendingRecords.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(async (record) => {
        const res = await createZitadelUser(record, isDryRun);
        return { record, res };
      })
    );

    for (const { record, res } of results) {
      processedInSession++;
      if (res.success) {
        sessionSuccess++;
        completedSet.add(record.phone.trim());
      } else {
        sessionFailed++;
        appendFailedRecord(record, res.error || "Unknown error");
        console.error(`\n⚠️ Failed [Line ${record.rawLineIndex}] (${record.firstname} ${record.lastname} - ${record.phone}): ${res.error}`);
      }
    }

    // Save checkpoint every batch
    progress.completedPhones = Array.from(completedSet);
    progress.totalSuccess += sessionSuccess;
    progress.totalFailed += sessionFailed;
    saveProgress(progress);

    const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.1);
    const speed = (processedInSession / elapsedSec).toFixed(1);
    const percent = (((progress.completedPhones.length) / records.length) * 100).toFixed(1);

    process.stdout.write(
      `\rProgress: ${progress.completedPhones.length}/${records.length} (${percent}%) | Success: ${progress.totalSuccess} | Failed: ${progress.totalFailed} | ${speed} req/s   `
    );

    if (batchDelayMs > 0 && i + concurrency < pendingRecords.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  console.log("\n\n=================================================");
  console.log("              MIGRATION COMPLETE                 ");
  console.log("=================================================");
  console.log(`Total Users In CSV    : ${records.length}`);
  console.log(`Total Succeeded       : ${progress.totalSuccess}`);
  console.log(`Total Failed          : ${progress.totalFailed}`);
  if (progress.totalFailed > 0) {
    console.log(`⚠️ Review failed records in: ${FAILED_FILE}`);
  }
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal exception:", err);
  process.exit(1);
});
