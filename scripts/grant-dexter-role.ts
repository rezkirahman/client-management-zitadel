import fs from "fs";
import path from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  let file = "migration-created-users.json";
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

const DEXTER_PROJECT_ID = "389811971056207875";
const ROLE_USER_KEY = "2"; // "user"

async function main() {
  const { file, issuer, pat } = parseArgs();
  const manifestPath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ ${file} not found!`);
    process.exit(1);
  }

  const users: Array<{ userId: string; phone?: string; name?: string }> = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  );

  console.log("=================================================");
  console.log("       ASSIGN DEXTER ROLES TO MIGRATED USERS     ");
  console.log("=================================================");
  console.log(`Target Issuer : ${issuer}`);
  console.log(`Project       : Dexter (${DEXTER_PROJECT_ID})`);
  console.log(`Role          : user (Key: ${ROLE_USER_KEY})`);
  console.log(`Total Users   : ${users.length}`);
  console.log("-------------------------------------------------\n");

  let successCount = 0;
  let failCount = 0;

  // Process in concurrent chunks of 10
  const CHUNK_SIZE = 10;
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (u) => {
        try {
          const res = await fetch(`${issuer}/management/v1/users/${u.userId}/grants`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${pat}`,
            },
            body: JSON.stringify({
              projectId: DEXTER_PROJECT_ID,
              roleKeys: [ROLE_USER_KEY],
            }),
          });

          if (res.ok) {
            successCount++;
          } else {
            const errText = await res.text();
            if (errText.includes("AlreadyExists") || res.status === 409) {
              successCount++; // already has grant
            } else {
              failCount++;
              console.error(`\n❌ Failed for ${u.name} (${u.userId}): ${errText}`);
            }
          }
        } catch (err: any) {
          failCount++;
          console.error(`\n❌ Network exception for ${u.name}:`, err.message);
        }
      })
    );

    process.stdout.write(
      `\rProgress: ${Math.min(i + CHUNK_SIZE, users.length)}/${users.length} | Granted: ${successCount} | Failed: ${failCount}   `
    );
  }

  console.log("\n\n=================================================");
  console.log("              GRANT ROLE COMPLETE                ");
  console.log("=================================================");
  console.log(`Total Granted : ${successCount}`);
  console.log(`Total Failed  : ${failCount}`);
  console.log("=================================================\n");
}

main().catch(console.error);
