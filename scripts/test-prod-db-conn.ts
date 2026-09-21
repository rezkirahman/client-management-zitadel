import fs from "fs";
import path from "path";
import { Client } from "pg";

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

const client = new Client({
  host: process.env.DB_POSTGRES_ADDRESS || "127.0.0.1",
  port: parseInt(process.env.DB_POSTGRES_PORT || "5432", 10),
  user: process.env.DB_POSTGRES_USER || "postgres",
  password: process.env.DB_POSTGRES_PASS || "",
  database: process.env.DB_POSTGRES_NAME || "agforce",
  connectionTimeoutMillis: 10000,
});

async function testProdConn() {
  console.log(`🐘 Connecting to PostgreSQL (${client.host}:${client.port}/${client.database})...`);
  try {
    await client.connect();
    console.log("✅ Connected to Production PostgreSQL successfully!");

    const dbInfo = await client.query("SELECT current_database(), current_user, version();");
    console.log("DB Info:", dbInfo.rows[0]);

    // Check table users exists
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'users';"
    );
    console.log("Table 'users' exists:", tableRes.rows.length > 0);

    // Check zitadel_id column
    const colRes = await client.query(
      "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'zitadel_id';"
    );
    if (colRes.rows.length > 0) {
      console.log("✅ Column 'zitadel_id' exists:", colRes.rows[0]);
    } else {
      console.log("⚠️ Column 'zitadel_id' DOES NOT exist in 'users' table!");
    }

    // Check how many users already have zitadel_id
    if (colRes.rows.length > 0) {
      const countRes = await client.query("SELECT count(zitadel_id) FROM users;");
      console.log("Users currently having zitadel_id:", countRes.rows[0].count);
    }

    // Sample 5 user records from DB matching some IDs in query_results.json
    const sampleRes = await client.query(
      "SELECT id, firstname, lastname, phone, zitadel_id FROM users WHERE id IN (2276, 7601, 2211, 160, 11526) ORDER BY id;"
    );
    console.log("Sample records in Production DB:");
    console.table(sampleRes.rows);

    await client.end();
  } catch (err: any) {
    console.error("❌ Failed to connect to Production DB:", err.message);
    process.exit(1);
  }
}

testProdConn();
