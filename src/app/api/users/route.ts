import { NextResponse } from "next/server";
import { getZitadelUsers, createZitadelUser } from "@/lib/zitadel-admin";

export async function GET() {
  try {
    const result = await getZitadelUsers();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengambil data user";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, pin, apps } = body;

    if (!firstName || !phone || !pin) {
      return NextResponse.json(
        { error: "Nama Depan, Nomor Telepon, dan PIN wajib diisi" },
        { status: 400 }
      );
    }

    if (pin.length < 6) {
      return NextResponse.json(
        { error: "PIN minimal harus 6 angka" },
        { status: 400 }
      );
    }

    const result = await createZitadelUser({
      firstName,
      lastName: lastName || "",
      phone,
      pin,
      apps: apps || [],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: result.userId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membuat user";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
