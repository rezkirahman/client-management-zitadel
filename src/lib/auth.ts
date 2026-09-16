import { NextAuthOptions } from "next-auth";
import ZitadelProvider from "next-auth/providers/zitadel";

const cleanEnv = (val?: string) => (val || "").replace(/^["']|["']$/g, "").trim();
const ZITADEL_ISSUER = cleanEnv(process.env.ZITADEL_ISSUER) || "https://sso.agforce.co.id";
const ZITADEL_CLIENT_ID = cleanEnv(process.env.ZITADEL_CLIENT_ID) || "390958723364902048";
const ZITADEL_CLIENT_SECRET = cleanEnv(process.env.ZITADEL_CLIENT_SECRET);
const ZITADEL_PAT = cleanEnv(process.env.ZITADEL_PAT);
const NEXTAUTH_SECRET = cleanEnv(process.env.NEXTAUTH_SECRET) || "agforce-sso-portal-secret-key-super-secure-2026";
const NEXTAUTH_URL = cleanEnv(process.env.NEXTAUTH_URL);

export const authOptions: NextAuthOptions = {
  providers: [
    ZitadelProvider({
      issuer: ZITADEL_ISSUER,
      clientId: ZITADEL_CLIENT_ID,
      clientSecret: ZITADEL_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: ZITADEL_CLIENT_SECRET ? "client_secret_post" : "none",
      },
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "openid profile email phone urn:zitadel:iam:org:project:roles",
          prompt: "select_account",
        },
      },
      profile(profile) {
        const name =
          profile.name ||
          [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
          profile.preferred_username ||
          profile.nickname ||
          profile.email ||
          profile.phone_number ||
          profile.sub;
        return {
          id: profile.sub,
          name: name,
          email: profile.email || profile.phone_number || profile.preferred_username || "",
          image: profile.picture || null,
          phone: profile.phone_number || profile.phone || "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile) {
        token.profile = profile;
      }
      const p = (token.profile || profile || {}) as Record<string, unknown>;
      const fullName =
        (p.name as string) ||
        [p.given_name, p.family_name].filter(Boolean).join(" ") ||
        (p.preferred_username as string) ||
        (p.nickname as string) ||
        (p.email as string) ||
        (p.phone_number as string) ||
        (token.name as string);

      if (fullName) token.name = fullName;

      const emailOrPhone =
        (p.email as string) ||
        (p.phone_number as string) ||
        (p.preferred_username as string) ||
        (token.email as string);

      if (emailOrPhone) token.email = emailOrPhone;
      token.phone = (p.phone_number as string) || (p.phone as string) || (token.phone as string) || "";
      token.roles = p["urn:zitadel:iam:org:project:roles"] || token.roles || {};

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      // Jika token.name masih berupa ID angka (ZITADEL User ID), ambil detail nama asli dari ZITADEL API
      const userId = (token.sub as string) || (profile?.sub as string);
      const isNumericId = token.name && /^\d+$/.test(String(token.name).trim());
      if ((!token.realName || isNumericId) && userId && ZITADEL_PAT) {
        try {
          const res = await fetch(`${ZITADEL_ISSUER}/v2/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${ZITADEL_PAT}`,
              "User-Agent": "Mozilla/5.0",
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const u = data.user;
            if (u) {
              const prof = u.human?.profile;
              const realName =
                prof?.displayName ||
                [prof?.givenName, prof?.familyName].filter(Boolean).join(" ") ||
                u.username;
              if (realName) {
                token.name = realName;
                token.realName = realName;
              }
              const realEmail = u.human?.email?.email || u.username;
              if (realEmail) token.email = realEmail;
              const realPhone = u.human?.phone?.phone || u.username;
              if (realPhone) token.phone = realPhone;
            }
          }
        } catch (err) {
          console.warn("[jwt callback] Failed to fetch user from ZITADEL API:", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        (session.user as Record<string, unknown>).phone =
          (token.phone as string) || (token.email as string);
      }
      if (token?.profile) {
        const profileObj = token.profile as Record<string, unknown>;
        session.user = {
          ...session.user,
          ...profileObj,
        };
      }
      (session as unknown as Record<string, unknown>).roles = token.roles;
      (session as unknown as Record<string, unknown>).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 Jam
  },
  secret: NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
  useSecureCookies: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://") ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://") ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
        maxAge: 900,
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || NEXTAUTH_URL.startsWith("https://"),
        maxAge: 900,
      },
    },
  },
};
