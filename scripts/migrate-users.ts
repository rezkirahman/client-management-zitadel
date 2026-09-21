import fs from "fs";
import path from "path";
import readline from "readline";
import crypto from "crypto";
import { Client } from "pg";
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
const ZITADEL_PAT = process.env.ZITADEL_PAT || "";

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
const CREATED_USERS_FILE = path.resolve(process.cwd(), "migration-created-users.json");
const MAPPING_CSV_FILE = path.resolve(process.cwd(), "migration-mapping.csv");
const SQL_DUMP_FILE = path.resolve(process.cwd(), "update_zitadel_ids.sql");

function parseArgs() {
  const args = process.argv.slice(2);
  let file = "users-dev-test.json";
  let concurrency = 10;
  let batchDelayMs = 250;
  let isDryRun = false;
  let resume = true;

  let issuer = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
  let pat = process.env.ZITADEL_PAT || "";

  let dbHost = process.env.DB_POSTGRES_ADDRESS || "";
  let dbPort = parseInt(process.env.DB_POSTGRES_PORT || "5432", 10);
  let dbUser = process.env.DB_POSTGRES_USER || "";
  let dbPass = process.env.DB_POSTGRES_PASS || "";
  let dbName = process.env.DB_POSTGRES_NAME || "";
  let grantDexter = false;
  let limit = 0;

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      file = arg.split("=")[1];
    } else if (arg.startsWith("--issuer=")) {
      issuer = arg.split("=")[1].replace(/\/$/, "");
    } else if (arg.startsWith("--pat=")) {
      pat = arg.split("=")[1];
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parseInt(arg.split("=")[1], 10) || 10;
    } else if (arg.startsWith("--delay=")) {
      batchDelayMs = parseInt(arg.split("=")[1], 10) || 250;
    } else if (arg === "--dry-run") {
      isDryRun = true;
    } else if (arg === "--no-resume" || arg === "--reset") {
      resume = false;
    } else if (arg.startsWith("--db-host=")) {
      dbHost = arg.split("=")[1];
    } else if (arg.startsWith("--db-port=")) {
      dbPort = parseInt(arg.split("=")[1], 10) || 5432;
    } else if (arg.startsWith("--db-user=")) {
      dbUser = arg.split("=")[1];
    } else if (arg.startsWith("--db-pass=")) {
      dbPass = arg.split("=")[1];
    } else if (arg.startsWith("--db-name=")) {
      dbName = arg.split("=")[1];
    } else if (arg === "--grant-dexter" || arg === "--dexter") {
      grantDexter = true;
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10) || 0;
    }
  }

  return {
    file,
    issuer,
    pat,
    concurrency,
    batchDelayMs,
    isDryRun,
    resume,
    dbHost,
    dbPort,
    dbUser,
    dbPass,
    dbName,
    grantDexter,
    limit,
  };
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

async function ensurePasswordPolicy(issuer: string, pat: string) {
  try {
    const res = await fetch(`${issuer}/management/v1/policies/password/complexity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({
        minLength: "6",
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: true,
        hasSymbol: false,
      }),
    });
    if (res.ok) {
      console.log(`🔐 Password policy checked: 6-digit numeric PIN is allowed on ${issuer}.`);
    }
  } catch {
    // Non-blocking
  }
}

async function grantDexterRole(issuer: string, pat: string, userId: string) {
  const isDev = issuer.includes("sso-dev");
  const projectId = isDev ? "389811971056207875" : "390864790551024800";
  const roleKey = isDev ? "2" : "4";

  try {
    await fetch(`${issuer}/management/v1/users/${userId}/grants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({
        projectId,
        roleKeys: [roleKey],
      }),
    });
  } catch {
    // Non-blocking
  }
}

async function setZitadelUserMetadata(issuer: string, pat: string, userId: string, key: string, value: string) {
  try {
    await fetch(`${issuer}/management/v1/users/${userId}/metadata/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({
        value: Buffer.from(value).toString("base64"),
      }),
    });
  } catch {
    // Non-blocking
  }
}

async function createZitadelUser(
  record: UserRecord,
  isDryRun: boolean,
  issuer: string,
  pat: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
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
  
  const rawEmail = (record.email || "").trim();
  const isValidEmail = rawEmail.includes("@") && !rawEmail.startsWith("-@") && rawEmail.length > 5;
  const email = isValidEmail ? rawEmail : `${username}@agforce.internal`;
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
    let res = await fetch(`${issuer}/v2/users/human`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify(payload),
    });

    // Auto-fallback: If 08... format hits a conflict, retry with +62... format so user is never left out
    if (!res.ok && res.status === 409 && payload.username !== e164) {
      payload.username = e164;
      res = await fetch(`${issuer}/v2/users/human`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pat}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const userId = data.userId || data.id;

    // 3. Save User Metadata (NIK, ID Karyawan, Cabang, Legacy DB ID)
    if (userId) {
      const metadataPromises: Promise<void>[] = [];
      if (record.legacyId) metadataPromises.push(setZitadelUserMetadata(issuer, pat, userId, "legacy_user_id", record.legacyId));
      if (record.nik) metadataPromises.push(setZitadelUserMetadata(issuer, pat, userId, "nik", record.nik));
      if (record.idKaryawan) metadataPromises.push(setZitadelUserMetadata(issuer, pat, userId, "id_karyawan", record.idKaryawan));
      if (record.branchs) metadataPromises.push(setZitadelUserMetadata(issuer, pat, userId, "branchs", record.branchs));

      if (metadataPromises.length > 0) {
        await Promise.allSettled(metadataPromises);
      }
    }

    return { success: true, userId };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

async function main() {
  const {
    file,
    issuer,
    pat,
    concurrency,
    batchDelayMs,
    isDryRun,
    resume,
    dbHost,
    dbPort,
    dbUser,
    dbPass,
    dbName,
    grantDexter,
    limit,
  } = parseArgs();

  const filePath = path.resolve(process.cwd(), file);

  console.log("=================================================");
  console.log("       AGFORCE SSO USER MIGRATION TOOL           ");
  console.log("=================================================");
  console.log(`Target File      : ${filePath}`);
  console.log(`ZITADEL Issuer   : ${issuer}`);
  console.log(`Mode             : ${isDryRun ? "DRY RUN (No API calls)" : "LIVE MIGRATION"}`);
  console.log(`Concurrency      : ${concurrency}`);
  console.log(`Batch Delay      : ${batchDelayMs} ms`);
  console.log(`Resume Checkpoint: ${resume ? "Enabled" : "Disabled"}`);
  console.log(`Grant Dexter     : ${grantDexter ? "Enabled" : "Disabled"}`);
  if (dbHost && dbUser) {
    console.log(`Database Sync    : ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
  } else {
    console.log(`Database Sync    : Disabled (No DB credentials specified)`);
  }
  console.log("-------------------------------------------------\n");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File ${filePath} not found!`);
    process.exit(1);
  }

  if (!isDryRun) {
    await ensurePasswordPolicy(issuer, pat);
  }

  // Connect to PostgreSQL if credentials configured
  let pgClient: Client | null = null;
  if (dbHost && dbUser && dbName && !isDryRun) {
    try {
      pgClient = new Client({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPass,
        database: dbName,
      });
      await pgClient.connect();
      console.log(`🐘 Connected to DB Agforce: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
      await pgClient.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS zitadel_id VARCHAR(64) UNIQUE;");
      await pgClient.query("CREATE INDEX IF NOT EXISTS idx_users_zitadel_id ON users(zitadel_id);");
    } catch (err: any) {
      console.error(`⚠️ Failed to connect to DB: ${err.message}. Direct DB sync will be skipped.`);
      pgClient = null;
    }
  }

  const progress = loadProgress(resume);
  const completedSet = new Set(progress.completedPhones);

  if (completedSet.size > 0) {
    console.log(`ℹ️ Resuming session: ${completedSet.size} users already processed previously.\n`);
  }

  let createdUsers: Array<{ userId: string; phone?: string; name?: string; legacyId?: string }> = [];
  if (resume && fs.existsSync(CREATED_USERS_FILE)) {
    try {
      createdUsers = JSON.parse(fs.readFileSync(CREATED_USERS_FILE, "utf-8"));
    } catch {}
  } else if (!resume) {
    if (fs.existsSync(CREATED_USERS_FILE)) fs.unlinkSync(CREATED_USERS_FILE);
    if (fs.existsSync(FAILED_FILE)) fs.unlinkSync(FAILED_FILE);
    fs.writeFileSync(MAPPING_CSV_FILE, "id,phone,zitadel_id\n", "utf-8");
    fs.writeFileSync(SQL_DUMP_FILE, "-- Production ZITADEL ID updates\n", "utf-8");
  }

  // Initialize mapping files if not existing
  if (!fs.existsSync(MAPPING_CSV_FILE)) {
    fs.writeFileSync(MAPPING_CSV_FILE, "id,phone,zitadel_id\n", "utf-8");
  }

  const rawHeaderChunk = fs.readFileSync(filePath, { encoding: "utf-8" }).slice(0, 50).trim();
  const isJson = filePath.toLowerCase().includes(".json") || rawHeaderChunk.startsWith("[") || rawHeaderChunk.startsWith("{");
  const records: UserRecord[] = [];
  let skippedDeleted = 0;
  let skippedDisabled = 0;
  let skippedNoPin = 0;

  if (isJson) {
    const rawContent = fs.readFileSync(filePath, "utf-8").trim();
    let jsonList: any[] = [];
    try {
      if (rawContent.startsWith("[")) {
        jsonList = JSON.parse(rawContent);
      } else {
        jsonList = rawContent
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      }
    } catch (err: any) {
      console.error("❌ Failed to parse JSON file:", err.message);
      process.exit(1);
    }

    let lineIndex = 0;
    for (const item of jsonList) {
      lineIndex++;
      const deletedAt = item.deleted_at || item.deletedAt;
      const disabled = item.disabled_account || item.disabledAccount || item.disabled;

      if (deletedAt) {
        skippedDeleted++;
        continue;
      }
      if (disabled === true || disabled === "true" || disabled === 1 || disabled === "1") {
        skippedDisabled++;
        continue;
      }

      const phone = String(item.phone || item.nohp || item.telepon || "").trim();
      const pin = String(item.pin || item.tokenpin || "").trim();
      const salt_pin = String(item.salt_pin || item.saltpin || item.salt || "").trim();

      if (!phone || !pin || !salt_pin) {
        skippedNoPin++;
        continue;
      }

      let firstname = String(item.firstname || item.nama_depan || "").trim();
      let lastname = String(item.lastname || item.nama_belakang || "").trim();
      const fallbackName = String(item.name || item.nama || item.fullname || "").trim();

      if (!firstname && fallbackName) {
        const parts = fallbackName.split(" ");
        firstname = parts[0] || "User";
        lastname = parts.slice(1).join(" ");
      }

      records.push({
        legacyId: item.id ? String(item.id) : undefined,
        firstname: firstname || "User",
        lastname,
        phone,
        pin,
        salt_pin,
        email: item.email ? String(item.email).trim() : undefined,
        gender: item.gender ? String(item.gender).trim() : undefined,
        nik: item.nik ? String(item.nik).trim() : undefined,
        idKaryawan: item.id_karyawan || item.idKaryawan ? String(item.id_karyawan || item.idKaryawan).trim() : undefined,
        branchs: item.branchs || item.branch ? String(item.branchs || item.branch).trim() : undefined,
        rawLineIndex: lineIndex,
      });
    }
  } else {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isHeader = true;
    let headerMap: Record<string, number> = {};
    let lineCount = 0;

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
  }

  console.log(`📊 Loaded ${records.length} valid user records from ${isJson ? "JSON" : "CSV"}.`);
  if (skippedDeleted > 0) console.log(`⏩ Skipped ${skippedDeleted} soft-deleted users (deleted_at).`);
  if (skippedDisabled > 0) console.log(`⏩ Skipped ${skippedDisabled} disabled users (disabled_account).`);
  if (skippedNoPin > 0) console.log(`⏩ Skipped ${skippedNoPin} records with empty PIN/phone.`);

  const pendingRecords = records.filter((r) => !completedSet.has(r.phone.trim()));
  console.log(`🚀 Remaining users to process: ${pendingRecords.length}\n`);

  if (pendingRecords.length === 0) {
    console.log("✅ All users have already been migrated according to migration-progress.json!");
    if (pgClient) await pgClient.end();
    process.exit(0);
  }

  const toProcess = limit > 0 ? pendingRecords.slice(0, limit) : pendingRecords;
  if (limit > 0) {
    console.log(`⚠️ Limit applied: processing only first ${toProcess.length} users for testing.`);
  }

  const startTime = Date.now();
  let processedInSession = 0;
  let sessionSuccess = 0;
  let sessionFailed = 0;

  const baseSuccess = progress.totalSuccess;
  const baseFailed = progress.totalFailed;

  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(async (record) => {
        const res = await createZitadelUser(record, isDryRun, issuer, pat);
        return { record, res };
      })
    );

    for (const { record, res } of results) {
      processedInSession++;
      if (res.success) {
        sessionSuccess++;
        completedSet.add(record.phone.trim());
        if (res.userId) {
          createdUsers.push({
            userId: res.userId,
            phone: record.phone,
            name: `${record.firstname} ${record.lastname}`.trim(),
            legacyId: record.legacyId,
          });

          // Write mapping CSV
          fs.appendFileSync(MAPPING_CSV_FILE, `${record.legacyId || ""},"${record.phone}","${res.userId}"\n`, "utf-8");

          // Write SQL dump file
          if (record.legacyId) {
            fs.appendFileSync(SQL_DUMP_FILE, `UPDATE users SET zitadel_id = '${res.userId}' WHERE id = ${record.legacyId};\n`, "utf-8");
          }

          // Direct DB update
          if (pgClient && record.legacyId) {
            try {
              await pgClient.query("UPDATE users SET zitadel_id = $1 WHERE id = $2", [res.userId, record.legacyId]);
            } catch (dbErr: any) {
              console.error(`\n⚠️ DB Update error [ID ${record.legacyId}]: ${dbErr.message}`);
            }
          }

          // Grant Dexter role
          if (grantDexter) {
            await grantDexterRole(issuer, pat, res.userId);
          }
        }
      } else {
        sessionFailed++;
        appendFailedRecord(record, res.error || "Unknown error");
        console.error(`\n⚠️ Failed [Line ${record.rawLineIndex}] (${record.firstname} ${record.lastname} - ${record.phone}): ${res.error}`);
      }
    }

    // Save checkpoint every batch (live runs only)
    if (!isDryRun) {
      progress.completedPhones = Array.from(completedSet);
      progress.totalSuccess = baseSuccess + sessionSuccess;
      progress.totalFailed = baseFailed + sessionFailed;
      saveProgress(progress);

      if (createdUsers.length > 0) {
        fs.writeFileSync(CREATED_USERS_FILE, JSON.stringify(createdUsers, null, 2), "utf-8");
      }
    }

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

  if (pgClient) {
    await pgClient.end();
    console.log("\n🐘 Disconnected from PostgreSQL DB.");
  }

  console.log("\n\n=================================================");
  console.log("              MIGRATION COMPLETE                 ");
  console.log("=================================================");
  console.log(`Total Users In File   : ${records.length}`);
  console.log(`Total Succeeded       : ${progress.totalSuccess}`);
  console.log(`Total Failed          : ${progress.totalFailed}`);
  console.log(`Mapping CSV           : ${MAPPING_CSV_FILE}`);
  console.log(`SQL Dump File         : ${SQL_DUMP_FILE}`);
  if (progress.totalFailed > 0) {
    console.log(`⚠️ Review failed records in: ${FAILED_FILE}`);
  }
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal exception:", err);
  process.exit(1);
});
