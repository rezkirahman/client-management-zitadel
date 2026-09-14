const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "https://sso-dev.agforce.co.id";
const ZITADEL_PAT = process.env.ZITADEL_PAT || "";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

export const SATELLITE_APPS = [
  { name: "Client Management", id: "390676529920608259", description: "Portal Admin User Management (Web Ini)" },
  { name: "Dexter", id: "389811971056207875", description: "Aplikasi Operasional Dexter" },
  { name: "Venturis", id: "389811986709350403", description: "Aplikasi Satelit Venturis" },
  { name: "Sixzense", id: "389812005969594371", description: "Aplikasi Satelit Sixzense" },
  { name: "AG Force", id: "389810084324050947", description: "Aplikasi Induk AG Force" },
] as const;

export interface NormalizedUser {
  id: string;
  username: string;
  name: string;
  phone: string;
  state: "ACTIVE" | "INACTIVE" | "LOCKED" | "UNSPECIFIED";
  createdAt?: string;
  apps: string[];
  type?: "HUMAN" | "MACHINE";
  grants?: Record<string, string>; // { "Dexter": "grant_id_123" }
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phone: string;
  pin: string;
  apps?: string[];
}

interface ZitadelUserItem {
  userId?: string;
  id?: string;
  state?: string;
  username?: string;
  human?: {
    profile?: {
      givenName?: string;
      familyName?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
    };
    phone?: {
      phone?: string;
      isPhoneVerified?: boolean;
    };
    email?: {
      email?: string;
    };
  };
  machine?: {
    name?: string;
    description?: string;
  };
  details?: {
    creationDate?: string;
  };
}

interface ZitadelGrantItem {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
}

/**
 * Mengambil daftar user dari ZITADEL V2 API (POST /v2/users) beserta grant aplikasinya
 */
export async function getZitadelUsers(): Promise<{ users: NormalizedUser[]; warning?: string }> {
  if (!ZITADEL_PAT) {
    return {
      users: getSampleUsers(),
      warning: "ZITADEL_PAT belum diisi di .env.local. Menampilkan data preview.",
    };
  }

  try {
    // 1. Fetch Users
    const resUsers = await fetch(`${ZITADEL_ISSUER}/v2/users`, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify({
        query: {
          limit: 100,
          asc: true,
        },
      }),
      cache: "no-store",
    });

    if (!resUsers.ok) {
      const errorText = await resUsers.text();
      console.error("[Zitadel API Error]", resUsers.status, errorText);

      if (resUsers.status === 401 || resUsers.status === 403) {
        return {
          users: getSampleUsers(),
          warning: "ZITADEL PAT kadaluarsa atau tidak memiliki izin. Silakan perbarui ZITADEL_PAT di .env.local.",
        };
      }
      throw new Error(`Zitadel API error (${resUsers.status}): ${errorText}`);
    }

    const dataUsers = await resUsers.json();
    const rawList: ZitadelUserItem[] = dataUsers.result || [];

    // 2. Fetch User Grants
    const userGrantsMap: Record<string, { apps: string[]; grants: Record<string, string> }> = {};
    try {
      const resGrants = await fetch(`${ZITADEL_ISSUER}/management/v1/users/grants/_search`, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          Authorization: `Bearer ${ZITADEL_PAT}`,
        },
        body: JSON.stringify({ query: { limit: 100 } }),
        cache: "no-store",
      });

      if (resGrants.ok) {
        const dataGrants = await resGrants.json();
        const rawGrants: ZitadelGrantItem[] = dataGrants.result || [];
        rawGrants.forEach((g) => {
          if (!userGrantsMap[g.userId]) {
            userGrantsMap[g.userId] = { apps: [], grants: {} };
          }
          // Mencocokkan nama aplikasi berdasarkan ID atau nama
          const appObj = SATELLITE_APPS.find((a) => a.id === g.projectId);
          const appName = appObj ? appObj.name : g.projectName;

          if (!userGrantsMap[g.userId].apps.includes(appName)) {
            userGrantsMap[g.userId].apps.push(appName);
          }
          userGrantsMap[g.userId].grants[appName] = g.id;
        });
      }
    } catch (e) {
      console.warn("Could not fetch user grants", e);
    }

    const users: NormalizedUser[] = rawList.map((item) => {
      const id = item.userId || item.id || "";
      const profile = item.human?.profile || {};
      const machine = item.machine || {};
      const phoneObj = item.human?.phone || {};
      const emailObj = item.human?.email || {};
      const stateStr = item.state || "";

      let state: NormalizedUser["state"] = "ACTIVE";
      if (stateStr.includes("INACTIVE")) state = "INACTIVE";
      if (stateStr.includes("LOCKED")) state = "LOCKED";

      const name =
        profile.displayName ||
        `${profile.givenName || profile.firstName || ""} ${profile.familyName || profile.lastName || ""}`.trim() ||
        machine.name ||
        item.username ||
        "-";

      const phone = phoneObj.phone || emailObj.email || item.username || "-";

      const grantData = userGrantsMap[id] || { apps: [], grants: {} };

      return {
        id,
        username: item.username || phone || "",
        name,
        phone,
        state,
        createdAt: item.details?.creationDate || new Date().toISOString(),
        apps: grantData.apps,
        grants: grantData.grants,
        type: item.human ? "HUMAN" : "MACHINE",
      };
    });

    return { users };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan";
    console.error("[getZitadelUsers Exception]", msg);
    return {
      users: getSampleUsers(),
      warning: `Gagal terhubung ke ZITADEL: ${msg}. Menampilkan data fallback.`,
    };
  }
}

/**
 * Mendaftarkan User Baru ke ZITADEL V2 API dan memberikan grant aplikasi yang dipilih
 */
export async function createZitadelUser(input: CreateUserInput): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!ZITADEL_PAT) {
    return { success: false, error: "ZITADEL_PAT belum diatur di .env.local" };
  }

  let formattedPhone = input.phone.trim();
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "+62" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+62" + formattedPhone;
  }

  const payload = {
    username: input.phone.trim(),
    profile: {
      givenName: input.firstName.trim(),
      familyName: input.lastName.trim(),
      displayName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    },
    phone: {
      phone: formattedPhone,
      isVerified: true,
    },
    password: {
      password: input.pin.trim(),
    },
  };

  try {
    const res = await fetch(`${ZITADEL_ISSUER}/v2/users/human`, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[createZitadelUser Error]", res.status, errText);
      return { success: false, error: `Gagal membuat user di ZITADEL: ${errText}` };
    }

    const data = await res.json();
    const userId = data.userId || data.id;

    // Tambahkan grants jika ada aplikasi yang dipilih
    if (userId && input.apps && input.apps.length > 0) {
      await updateUserAppGrants(userId, input.apps);
    }

    return { success: true, userId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat user";
    return { success: false, error: msg };
  }
}

/**
 * Mengubah Hak Akses Aplikasi Karyawan (Menambah & Menghapus User Grants di ZITADEL)
 */
export async function updateUserAppGrants(
  userId: string,
  targetAppNames: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!ZITADEL_PAT) {
    return { success: false, error: "ZITADEL_PAT belum diatur di .env.local" };
  }

  try {
    // 1. Ambil grant yang saat ini dimiliki user
    const resSearch = await fetch(`${ZITADEL_ISSUER}/management/v1/users/grants/_search`, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify({
        query: { limit: 100 },
        queries: [{ userIdQuery: { userId } }],
      }),
    });

    let currentGrants: { id: string; projectId: string; appName: string }[] = [];
    if (resSearch.ok) {
      const data = await resSearch.json();
      currentGrants = (data.result || []).map((g: ZitadelGrantItem) => {
        const appObj = SATELLITE_APPS.find((a) => a.id === g.projectId);
        return {
          id: g.id,
          projectId: g.projectId,
          appName: appObj ? appObj.name : g.projectName,
        };
      });
    }

    const currentAppNames = currentGrants.map((g) => g.appName);

    // 2. Tambah grant untuk aplikasi yang baru dicentang
    for (const app of SATELLITE_APPS) {
      if (targetAppNames.includes(app.name) && !currentAppNames.includes(app.name)) {
        await fetch(`${ZITADEL_ISSUER}/management/v1/users/${userId}/grants`, {
          method: "POST",
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ZITADEL_PAT}`,
          },
          body: JSON.stringify({
            projectId: app.id,
          }),
        });
      }
    }

    // 3. Hapus grant untuk aplikasi yang dihapus centangnya
    for (const g of currentGrants) {
      if (!targetAppNames.includes(g.appName)) {
        await fetch(`${ZITADEL_ISSUER}/management/v1/users/${userId}/grants/${g.id}`, {
          method: "DELETE",
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ZITADEL_PAT}`,
          },
        });
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui akses aplikasi";
    return { success: false, error: msg };
  }
}

/**
 * Reset PIN / Password User (POST /v2/users/{userId}/password)
 */
export async function resetZitadelUserPin(userId: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  if (!ZITADEL_PAT) {
    return { success: false, error: "ZITADEL_PAT belum diatur di .env.local" };
  }

  try {
    const res = await fetch(`${ZITADEL_ISSUER}/v2/users/${userId}/password`, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify({
        password: newPin.trim(),
        changeRequired: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gagal reset PIN: ${errText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal reset PIN";
    return { success: false, error: msg };
  }
}

/**
 * Mengubah Status User: Aktif / Nonaktif
 */
export async function toggleZitadelUserState(userId: string, activate: boolean): Promise<{ success: boolean; error?: string }> {
  if (!ZITADEL_PAT) {
    return { success: false, error: "ZITADEL_PAT belum diatur di .env.local" };
  }

  const endpoint = activate
    ? `${ZITADEL_ISSUER}/v2/users/${userId}/reactivate`
    : `${ZITADEL_ISSUER}/v2/users/${userId}/deactivate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${ZITADEL_PAT}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gagal mengubah status: ${errText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengubah status";
    return { success: false, error: msg };
  }
}

/**
 * Sample / Fallback Data untuk Preview UI saat ZITADEL PAT belum aktif
 */
function getSampleUsers(): NormalizedUser[] {
  return [
    {
      id: "usr_01",
      username: "081234567890",
      name: "Budi Santoso",
      phone: "+6281234567890",
      state: "ACTIVE",
      createdAt: "2026-09-08T09:15:00Z",
      apps: ["Client Management", "Dexter", "Venturis"],
    },
    {
      id: "usr_02",
      username: "081298765432",
      name: "Siti Rahmawati",
      phone: "+6281298765432",
      state: "ACTIVE",
      createdAt: "2026-09-09T14:20:00Z",
      apps: ["Dexter", "Sixzense"],
    },
    {
      id: "usr_03",
      username: "085611223344",
      name: "Ahmad Fauzi",
      phone: "+6285611223344",
      state: "INACTIVE",
      createdAt: "2026-09-10T11:00:00Z",
      apps: ["Venturis"],
    },
    {
      id: "usr_04",
      username: "087799887766",
      name: "Dewi Lestari",
      phone: "+6287799887766",
      state: "ACTIVE",
      createdAt: "2026-09-11T08:45:00Z",
      apps: ["Client Management", "Dexter", "Venturis", "Sixzense"],
    },
  ];
}
