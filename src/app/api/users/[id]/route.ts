import { NextResponse } from "next/server";
import {
  resetZitadelUserPin,
  toggleZitadelUserState,
  updateUserAppGrants,
} from "@/lib/zitadel-admin";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const { action } = body;

    if (action === "update_apps") {
      const { targetApps } = body;
      if (!Array.isArray(targetApps)) {
        return NextResponse.json(
          { error: "targetApps harus berupa array" },
          { status: 400 }
        );
      }
      const res = await updateUserAppGrants(userId, targetApps);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "reset_pin") {
      const { newPin } = body;
      if (!newPin || newPin.length < 6) {
        return NextResponse.json(
          { error: "PIN baru minimal 6 digit" },
          { status: 400 }
        );
      }
      const res = await resetZitadelUserPin(userId, newPin);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_state") {
      const { active } = body;
      const res = await toggleZitadelUserState(userId, !!active);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Action tidak dikenali" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memproses request";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
