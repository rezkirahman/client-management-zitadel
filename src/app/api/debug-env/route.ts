import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cleanEnv = (val?: string) => (val || "").replace(/^["']|["']$/g, "").trim();

  const issuer = cleanEnv(process.env.ZITADEL_ISSUER) || "https://sso.agforce.co.id";
  const pat = cleanEnv(process.env.ZITADEL_PAT);
  const clientId = cleanEnv(process.env.ZITADEL_CLIENT_ID);
  const nextAuthUrl = cleanEnv(process.env.NEXTAUTH_URL);
  const trustHost = cleanEnv(process.env.AUTH_TRUST_HOST);

  const userAgents = [
    { name: "Mozilla_Chrome", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    { name: "Agforce_Backend", ua: "Agforce-Backend/1.0" },
    { name: "Curl", ua: "curl/8.5.0" },
    { name: "Node_Default", ua: undefined },
  ];

  const testResults: Record<string, { status: number | null; isCloudflare: boolean; preview: string }> = {};

  for (const item of userAgents) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      };
      if (item.ua) headers["User-Agent"] = item.ua;

      const res = await fetch(`${issuer}/v2/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: { limit: 1 } }),
        cache: "no-store",
      });
      const text = await res.text();
      testResults[item.name] = {
        status: res.status,
        isCloudflare: text.includes("challenges.cloudflare.com") || text.includes("Just a moment..."),
        preview: text.slice(0, 200),
      };
    } catch (e: unknown) {
      testResults[item.name] = {
        status: null,
        isCloudflare: false,
        preview: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json({
    envCheck: {
      hasIssuer: Boolean(process.env.ZITADEL_ISSUER),
      issuer,
      hasPat: Boolean(process.env.ZITADEL_PAT),
      patLength: pat.length,
      patPrefix: pat.slice(0, 10),
      patSuffix: pat.slice(-10),
      hasClientId: Boolean(process.env.ZITADEL_CLIENT_ID),
      clientId,
      hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      nextAuthUrl,
      trustHost,
      nodeEnv: process.env.NODE_ENV,
    },
    zitadelTests: testResults,
  });
}
