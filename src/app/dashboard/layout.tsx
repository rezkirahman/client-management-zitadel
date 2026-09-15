"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  CheckCircle2,
  ShieldAlert,
  Lock,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const user = session?.user as ExtendedUser | undefined;

  // Verifikasi apakah user memiliki hak akses ke project Client Management
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          setHasAccess(data.hasAccess ?? true);
        })
        .catch(() => {
          setHasAccess(true);
        });
    }
  }, [status]);

  // Jika hak akses diperiksa dan user TIDAK punya grant ke Client Management
  if (hasAccess === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/30 shadow-xl bg-card text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Akses Ditolak (403 Forbidden)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Akun Anda berhasil terautentikasi melalui ZITADEL SSO, namun belum memiliki izin akses ke portal <strong>Client Management</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-left space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Nama Akun:</strong> {user?.name || "User"}</p>
              <p><strong className="text-foreground">Identitas:</strong> {user?.email || user?.phone || "-"}</p>
              <p className="text-[11px] text-amber-500 mt-2 font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Hanya user dengan izin &apos;Client Management&apos; yang dapat mengelola portal ini.</span>
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full text-xs gap-2 text-foreground border-border"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Ganti Akun / Logout</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-md transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-semibold text-foreground">
                Portal Client Management
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                • SSO & Identity Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/20 bg-primary/10 py-1 px-2.5 text-xs text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">ZITADEL IdP Connected</span>
              <span className="sm:hidden">ZITADEL</span>
            </Badge>

            <ThemeToggle />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

