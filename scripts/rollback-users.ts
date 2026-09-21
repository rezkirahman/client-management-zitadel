import fs from "fs";
import path from "path";

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

interface CreatedUserRecord {
  userId: string;
  phone?: string;
  name?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let issuer = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
  let pat = process.env.ZITADEL_PAT || "";

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      file = arg.split("=")[1];
    } else if (arg.startsWith("--issuer=")) {
      issuer = arg.split("=")[1].replace(/\/$/, "");
    } else if (arg.startsWith("--pat=")) {
      pat = arg.split("=")[1];
    }
  }

  return { file, issuer, pat };
}

async function main() {
  const { file, issuer, pat } = parseArgs();
  const filePath = path.resolve(process.cwd(), file);

  console.log("=================================================");
  console.log("         ZITADEL USER ROLLBACK TOOL              ");
  console.log("=================================================");
  console.log(`Manifest File  : ${filePath}`);
  console.log(`ZITADEL Issuer : ${issuer}`);
  console.log("-------------------------------------------------\n");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Manifest file ${filePath} not found!`);
    console.log("No users recorded for rollback.");
    process.exit(1);
  }

  let users: CreatedUserRecord[] = [];
  try {
    users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err: any) {
    console.error("❌ Failed to parse manifest JSON:", err.message);
    process.exit(1);
  }

  if (users.length === 0) {
    console.log("ℹ️ Manifest is empty. No users to delete.");
    process.exit(0);
  }

  console.log(`⚠️ WARNING: About to permanently DELETE ${users.length} users from ${issuer}!\n`);

  let deletedCount = 0;
  let failCount = 0;

  for (const u of users) {
    if (!u.userId) continue;

    try {
      const res = await fetch(`${issuer}/v2/users/${u.userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${pat}`,
        },
      });

      if (res.ok || res.status === 404) {
        deletedCount++;
        process.stdout.write(`\r🗑️ Deleted ${deletedCount}/${users.length} users... (${u.name || u.phone || u.userId})     `);
      } else {
        failCount++;
        console.error(`\n❌ Failed to delete ${u.userId} (${u.name}): HTTP ${res.status}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`\n❌ Exception deleting ${u.userId}:`, err.message);
    }
  }

  console.log("\n\n=================================================");
  console.log("               ROLLBACK COMPLETE                 ");
  console.log("=================================================");
  console.log(`Total Deleted  : ${deletedCount}`);
  console.log(`Total Failed   : ${failCount}`);
  console.log("=================================================\n");

  if (deletedCount > 0 && failCount === 0) {
    fs.unlinkSync(filePath);
    console.log(`🧹 Removed manifest file: ${file}`);
  }
}

main().catch((err) => {
  console.error("Fatal rollback error:", err);
  process.exit(1);
});
