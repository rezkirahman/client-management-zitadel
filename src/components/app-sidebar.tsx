"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Users,
  Building2,
  ExternalLink,
  LogOut,
  ChevronsUpDown,
  Layers,
  Sparkles,
  Shield,
  Briefcase,
  Compass,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string;
}

const mainNavItems = [
  {
    title: "Manajemen Karyawan",
    url: "/dashboard/users",
    icon: Users,
    badge: null,
  },
];

const satelliteApps = [
  {
    name: "Client Management",
    url: "http://localhost:3000",
    icon: Shield,
    isCurrent: true,
  },
  {
    name: "Dexter",
    url: "https://dexter.agforce.co.id",
    icon: Sparkles,
  },
  {
    name: "Venturis",
    url: "https://venturis.agforce.co.id",
    icon: Briefcase,
  },
  {
    name: "Sixzense",
    url: "https://sixzense.agforce.co.id",
    icon: Compass,
  },
  {
    name: "AG Force",
    url: "https://agforce.co.id",
    icon: Layers,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const user = session?.user as ExtendedUser | undefined;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
              asChild
            >
              <Link href="/dashboard/users" className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-sidebar-foreground tracking-tight">
                    Agforce
                  </span>
                  <span className="truncate text-xs text-muted-foreground font-medium">
                    SSO Client Hub
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                          : ""
                      }
                    >
                      <Link href={item.url}>
                        <Icon className={isActive ? "text-sidebar-primary" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Satellite Apps Ecosystem */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Aplikasi Satelit (SSO)
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {satelliteApps.map((app) => {
                const Icon = app.icon;
                return (
                  <SidebarMenuItem key={app.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={`${app.name} ${app.isCurrent ? "(Portal Ini)" : "(Buka)"}`}
                    >
                      <a
                        href={app.url}
                        target={app.isCurrent ? "_self" : "_blank"}
                        rel="noreferrer"
                        className="flex items-center justify-between group/link"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="size-4 shrink-0 text-muted-foreground group-hover/link:text-sidebar-primary transition-colors" />
                          <span className="truncate text-xs font-medium">
                            {app.name}
                          </span>
                        </div>
                        {app.isCurrent ? (
                          <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded shrink-0">
                            Aktif
                          </span>
                        ) : (
                          <ExternalLink className="size-3 shrink-0 text-muted-foreground/60 group-hover/link:text-muted-foreground transition-colors ml-auto" />
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-sidebar-border">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-xs">
                      {user?.name || "Admin Agforce"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {user?.phone || user?.email || "HR Administrator"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg p-1.5"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={6}
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex items-center gap-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg border border-border">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-xs">
                        {user?.name || "Admin Agforce"}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {user?.phone || user?.email || "HR Administrator"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2 text-xs py-2"
                >
                  <LogOut className="size-4" />
                  <span>Keluar (Sign Out)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Resize / Collapse Rail */}
      <SidebarRail />
    </Sidebar>
  );
}
