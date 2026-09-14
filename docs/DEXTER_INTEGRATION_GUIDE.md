# Panduan Pasang SSO ZITADEL di Dexter

Dokumen ringkas cara pasang Single Sign-On (SSO) di aplikasi Dexter (React + Express).

---

## 1. Kredensial SSO

Simpan di file `.env`:

```env
ZITADEL_ISSUER=https://sso-dev.agforce.co.id
ZITADEL_CLIENT_ID=389995888786802691
```

> **Catatan:** Flow menggunakan **PKCE**. Tidak perlu *Client Secret*.

---

## 2. Pasang di Frontend (React)

### Langkah 2.1: Install Library
```bash
npm install react-oidc-context oidc-client-ts
```

### Langkah 2.2: Bungkus Aplikasi (`main.tsx` atau `index.tsx`)
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App";

const oidcConfig = {
  authority: "https://sso-dev.agforce.co.id",
  client_id: "389995888786802691",
  redirect_uri: window.location.origin + "/callback",
  response_type: "code",
  scope: "openid profile email phone urn:zitadel:iam:org:project:roles",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider {...oidcConfig}>
    <App />
  </AuthProvider>
);
```

### Langkah 2.3: Tombol Login & Ambil Token (`App.tsx`)
```tsx
import { useAuth } from "react-oidc-context";

export default function App() {
  const auth = useAuth();

  if (auth.isLoading) return <div>Loading...</div>;

  // Jika sudah login
  if (auth.isAuthenticated && auth.user) {
    return (
      <div>
        <p>Halo, {auth.user.profile.name || auth.user.profile.preferred_username}</p>
        <p>No HP: {auth.user.profile.phone_number || auth.user.profile.phone}</p>
        
        {/* Gunakan token ini saat panggil API backend */}
        <button onClick={() => {
          fetch("/api/orders", {
            headers: { Authorization: `Bearer ${auth.user?.access_token}` }
          });
        }}>
          Panggil Backend
        </button>

        <button onClick={() => auth.signoutRedirect()}>Logout</button>
      </div>
    );
  }

  // Jika belum login
  return (
    <button onClick={() => auth.signinRedirect()}>
      Login SSO AgForce
    </button>
  );
}
```

---

## 3. Pasang di Backend (Express)

### Langkah 3.1: Install Library
```bash
npm install jose
```

### Langkah 3.2: Middleware Verifikasi Token (`authMiddleware.js` / `.ts`)
```javascript
import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://sso-dev.agforce.co.id";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/oauth/v2/keys`));

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    req.user = payload; // data user (sub, phone, roles)
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid atau expired" });
  }
}
```

### Langkah 3.3: Pasang di Route Express (`server.js` / `.ts`)
```javascript
import express from "express";
import { requireAuth } from "./authMiddleware";

const app = express();

// Route yang diproteksi SSO
app.get("/api/orders", requireAuth, (req, res) => {
  res.json({
    message: "Akses berhasil!",
    userId: req.user.sub,
    data: ["Order 1", "Order 2"]
  });
});

app.listen(5000, () => console.log("Backend berjalan di port 5000"));
```
