import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "https://sso.agforce.co.id";
const ZITADEL_PAT = process.env.ZITADEL_PAT || "";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const userId =
    (session.user as Record<string, unknown>).sub as string ||
    (session.user as Record<string, unknown>).id as string ||
    "";

  // Jika tidak ada PAT, izinkan untuk keperluan development preview
  if (!ZITADEL_PAT) {
    return NextResponse.json({
      authenticated: true,
      hasAccess: true,
      user: session.user,
    });
  }

  try {
    // Cek apakah user memiliki grant ke project Client Management
    const res = await fetch(`${ZITADEL_ISSUER}/management/v1/users/grants/_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZITADEL_PAT}`,
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        query: { limit: 100 },
        queries: [{ userIdQuery: { userId } }],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      // Fallback izinkan jika gagal cek API
      return NextResponse.json({
        authenticated: true,
        hasAccess: true,
        user: session.user,
      });
    }

    const data = await res.json();
    const grants: { projectId: string; projectName: string }[] = data.result || [];
    
    // User punya akses jika memiliki grant ke Client Management atau adalah ZITADEL Admin
    const hasClientManagement = grants.some((g) =>
      g.projectName.toLowerCase().includes("client")
    );

    // Atau jika user adalah admin
    const isAdmin =
      (session.user.name || "").toLowerCase().includes("admin") ||
      (session.user.email || "").toLowerCase().includes("admin");

    return NextResponse.json({
      authenticated: true,
      hasAccess: hasClientManagement || isAdmin,
      grants: grants.map((g) => g.projectName),
      user: session.user,
    });
  } catch (error: unknown) {
    console.error("[api/auth/me error]", error);
    return NextResponse.json({
      authenticated: true,
      hasAccess: true,
      user: session.user,
    });
  }
}
