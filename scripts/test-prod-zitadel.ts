const issuer = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
const pat = process.env.ZITADEL_PAT;

async function testZitadelProd() {
  console.log(`🔐 Testing ZITADEL Production (${issuer})...`);
  try {
    // 1. Check current authenticated user / token info
    const meRes = await fetch(`${issuer}/auth/v1/users/me`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    console.log("Token check status:", meRes.status, meRes.statusText);
    if (!meRes.ok) {
      console.log("Response:", await meRes.text());
    }

    // 2. Check Password Complexity Policy
    const polRes = await fetch(`${issuer}/management/v1/policies/password/complexity`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    console.log("Password complexity policy status:", polRes.status);
    if (polRes.ok) {
      const polData = await polRes.json();
      console.log("Policy:", polData);
    }

    // 3. Check Dexter Project in Prod
    const projectId = "390864790551024800";
    const projRes = await fetch(`${issuer}/management/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    console.log("Dexter Project check status:", projRes.status);
    if (projRes.ok) {
      const projData = await projRes.json();
      console.log("Project Name:", projData.project?.name);
    }

    // 4. Check Project Roles
    const rolesRes = await fetch(`${issuer}/management/v1/projects/${projectId}/roles/_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({}),
    });
    console.log("Roles search status:", rolesRes.status);
    if (rolesRes.ok) {
      const rolesData = await rolesRes.json();
      console.log("Roles in Dexter Project:");
      console.table(rolesData.result);
    }
  } catch (err: any) {
    console.error("❌ ZITADEL Error:", err.message);
  }
}

testZitadelProd();
