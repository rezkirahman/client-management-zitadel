"use client";

import React, { useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, Lock, KeyRound, Smartphone, Building2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  let message = "Terjadi kesalahan saat autentikasi ke ZITADEL.";
  if (error === "OAuthCallback") {
    message = "Koneksi sesi SSO terputus atau token state perlu di-refresh. Silakan klik tombol Login kembali.";
  }

  return (
    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  );
}

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Jika sudah login, arahkan langsung ke dashboard user
  if (status === "authenticated") {
    router.replace("/dashboard/users");
  }

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn("zitadel", { callbackUrl: "/dashboard/users" });
    } catch (err) {
      console.error("Login failed:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/40 p-4">
      {/* Top-Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background glow decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Agforce <span className="text-primary">SSO</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Portal Autentikasi & Manajemen Pengguna Terpusat
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border shadow-xl backdrop-blur-sm bg-card">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="flex justify-center">
              <Badge variant="outline" className="gap-1.5 py-1 px-3 border-primary/20 bg-primary/10 text-primary">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Single Sign-On Terintegrasi</span>
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Selamat Datang Kembali
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Akses aman untuk seluruh ekosistem aplikasi Agforce (Dexter, Venturis, Sixzense) dalam satu pintu.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Suspense fallback={null}>
              <LoginErrorBanner />
            </Suspense>

            <div className="p-3.5 rounded-lg border border-border bg-muted/50 text-xs text-foreground space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <KeyRound className="w-4 h-4 text-primary shrink-0" />
                <span>Metode Autentikasi Karyawan</span>
              </div>
              <ul className="space-y-1 pl-6 list-disc text-muted-foreground">
                <li>Masukkan <strong>Nomor Telepon</strong> terdaftar</li>
                <li>Verifikasi dengan <strong>PIN 6-Digit</strong> keamanan</li>
              </ul>
            </div>

            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 group"
              onClick={handleLogin}
              disabled={isLoading || status === "loading"}
            >
              <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{isLoading ? "Menghubungkan ke ZITADEL..." : "Login with Agforce"}</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex flex-col gap-2 border-t border-border text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Didukung oleh ZITADEL Identity Engine</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Butuh bantuan akses atau reset PIN? Hubungi tim HR / Administrator Agforce.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
