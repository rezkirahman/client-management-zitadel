import { NextAuthOptions } from "next-auth";
import ZitadelProvider from "next-auth/providers/zitadel";

export const authOptions: NextAuthOptions = {
  providers: [
    ZitadelProvider({
      issuer: process.env.ZITADEL_ISSUER || "https://sso-dev.agforce.co.id",
      clientId: process.env.ZITADEL_CLIENT_ID || "390676713547302915",
      clientSecret: process.env.ZITADEL_CLIENT_SECRET || "",
      client: {
        token_endpoint_auth_method: process.env.ZITADEL_CLIENT_SECRET ? "client_secret_post" : "none",
      },
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "openid profile email phone urn:zitadel:iam:org:project:roles",
          // Memastikan ZITADEL menampilkan layar pilih akun / login daripada otomatis login diam-diam
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile) {
        token.profile = profile;
        const profileObj = profile as Record<string, unknown>;
        token.name =
          (profileObj.name as string) ||
          (profileObj.preferred_username as string) ||
          (profileObj.given_name as string) ||
          token.name;
        token.email =
          (profileObj.email as string) ||
          (profileObj.phone as string) ||
          (profileObj.preferred_username as string) ||
          token.email;
        token.roles = profileObj["urn:zitadel:iam:org:project:roles"] || {};
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
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
  secret: process.env.NEXTAUTH_SECRET || "agforce-sso-portal-secret-key-super-secure-2026",
};
