import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cleanEnv = (val?: string) => (val || "").replace(/^["']|["']$/g, "").trim();

  const issuer = cleanEnv(process.env.ZITADEL_ISSUER) || "https://sso.agforce.co.id";
  const pat = cleanEnv(process.env.ZITADEL_PAT);
  const clientId = cleanEnv(process.env.ZITADEL_CLIENT_ID);
  const nextAuthUrl = cleanEnv(process.env.NEXTAUTH_URL);
  const trustHost = cleanEnv(process.env.AUTH_TRUST_HOST);

  let zitadelResponseStatus: number | null = null;
  let zitadelResponseBody: string | null = null;
  let zitadelError: string | null = null;

  try {
    const res = await fetch(`${issuer}/v2/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ query: { limit: 1 } }),
      cache: "no-store",
    });
    zitadelResponseStatus = res.status;
    zitadelResponseBody = await res.text();
  } catch (err: unknown) {
    zitadelError = err instanceof Error ? err.message : String(err);
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
    zitadelTest: {
      status: zitadelResponseStatus,
      responsePreview: zitadelResponseBody ? zitadelResponseBody.slice(0, 500) : null,
      error: zitadelError,
    },
  });
}
