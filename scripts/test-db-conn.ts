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
  database: process.env.DB_POSTGRES_NAME || "postgres",
});

async function testConn() {
  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL successfully!");
    const res = await client.query("SELECT current_database(), current_user, version();");
    console.log("DB Info:", res.rows[0]);

    const colRes = await client.query(
      "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'zitadel_id';"
    );
    console.log("zitadel_id column info:", colRes.rows[0]);

    const sampleUser = await client.query(
      "SELECT id, firstname, lastname, phone, zitadel_id FROM users WHERE id IN (1466, 1468, 1473, 1479, 1482) ORDER BY id;"
    );
    console.log("Sample users in DB AFTER update:");
    console.table(sampleUser.rows);

    const countRes = await client.query("SELECT count(zitadel_id) FROM users;");
    console.log("Total users with zitadel_id in DB:", countRes.rows[0].count);

    await client.end();
  } catch (err: any) {
    console.error("❌ Connection error:", err.message);
  }
}

testConn();
