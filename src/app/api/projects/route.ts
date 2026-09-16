import { NextResponse } from "next/server";
import { getZitadelProjects } from "@/lib/zitadel-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await getZitadelProjects();
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengambil daftar proyek";
    return NextResponse.json({ projects: [], error: msg }, { status: 500 });
  }
}
