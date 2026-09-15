"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  KeyRound,
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Smartphone,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NormalizedUser, SATELLITE_APPS } from "@/lib/zitadel-admin";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<NormalizedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // State Dialog Tambah User
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    pin: "",
    apps: ["Dexter", "Venturis"] as string[],
  });

  // State Dialog Reset PIN
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<NormalizedUser | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resetPinSubmitting, setResetPinSubmitting] = useState(false);
  const [resetPinSuccess, setResetPinSuccess] = useState(false);

  // State Dialog Kelola Hak Akses Aplikasi
  const [isManageAppsOpen, setIsManageAppsOpen] = useState(false);
  const [selectedUserForApps, setSelectedUserForApps] = useState<NormalizedUser | null>(null);
  const [targetApps, setTargetApps] = useState<string[]>([]);
  const [manageAppsSubmitting, setManageAppsSubmitting] = useState(false);
  const [manageAppsSuccess, setManageAppsSuccess] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
      if (data.warning) {
        setWarning(data.warning);
      } else {
        setWarning(null);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.username.includes(searchQuery);

    if (!matchSearch) return false;
    if (filterStatus === "ACTIVE") return u.state === "ACTIVE";
    if (filterStatus === "INACTIVE") return u.state !== "ACTIVE";
    return true;
  });

  // Metrik
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.state === "ACTIVE").length;
  const inactiveCount = users.filter((u) => u.state !== "ACTIVE").length;

  // Handle Tambah User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newUser.firstName || !newUser.phone || !newUser.pin) {
      setFormError("Nama depan, No. HP, dan PIN 6-digit wajib diisi.");
      return;
    }

    if (newUser.pin.length !== 6 || !/^\d+$/.test(newUser.pin)) {
      setFormError("PIN harus tepat 6 digit angka.");
      return;
    }

    try {
      setSubmittingUser(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membuat user");
      }

      // Berhasil
      setIsAddUserOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        phone: "",
        pin: "",
        apps: ["Dexter", "Venturis"],
      });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat user";
      setFormError(msg);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Handle Reset PIN
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin || newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      return;
    }

    try {
      setResetPinSubmitting(true);
      const res = await fetch(`/api/users/${selectedUserForPin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_pin", newPin }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal reset PIN");
      }

      setResetPinSuccess(true);
      setTimeout(() => {
        setIsResetPinOpen(false);
        setResetPinSuccess(false);
        setNewPin("");
        setSelectedUserForPin(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal reset PIN";
      alert(`Gagal reset PIN: ${msg}`);
    } finally {
      setResetPinSubmitting(false);
    }
  };

  // Open Dialog Kelola Akses Aplikasi
  const openManageAppsDialog = (user: NormalizedUser) => {
    setSelectedUserForApps(user);
    setTargetApps(user.apps || []);
    setIsManageAppsOpen(true);
    setManageAppsSuccess(false);
  };

  // Handle Simpan Hak Akses Aplikasi
  const handleSaveApps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForApps) return;

    try {
      setManageAppsSubmitting(true);
      const res = await fetch(`/api/users/${selectedUserForApps.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_apps", targetApps }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal memperbarui hak akses aplikasi");
      }

      setManageAppsSuccess(true);
      setTimeout(() => {
        setIsManageAppsOpen(false);
        setManageAppsSuccess(false);
        setSelectedUserForApps(null);
        fetchUsers();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui akses";
      alert(`Error: ${msg}`);
    } finally {
      setManageAppsSubmitting(false);
    }
  };

  // Handle Toggle State (Aktif / Nonaktif)
  const handleToggleState = async (user: NormalizedUser) => {
    const willActivate = user.state !== "ACTIVE";
    const confirmMsg = willActivate
      ? `Aktifkan kembali akun ${user.name}?`
      : `Nonaktifkan akun ${user.name}? User tidak akan bisa login ke Dexter / Venturis.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_state", active: willActivate }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal mengubah status user");
      }

      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manajemen Karyawan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akses Single Sign-On (SSO), status akun, dan PIN karyawan ekosistem Agforce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddUserOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Karyawan</span>
          </Button>
        </div>
      </div>

      {/* Warning Notice jika ZITADEL PAT belum terhubung */}
      {warning && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Perhatian Integrasi ZITADEL API
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {warning}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Karyawan
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Akun terdaftar di ZITADEL IdP</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-primary">
              Akun Aktif
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Dapat login via No. HP & PIN</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Akun Nonaktif
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Akses SSO dicabut sementara</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau no. telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={filterStatus === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("ALL")}
              className="text-xs h-8"
            >
              Semua ({totalCount})
            </Button>
            <Button
              variant={filterStatus === "ACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("ACTIVE")}
              className="text-xs h-8"
            >
              Aktif ({activeCount})
            </Button>
            <Button
              variant={filterStatus === "INACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("INACTIVE")}
              className="text-xs h-8"
            >
              Nonaktif ({inactiveCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>No. Telepon (Login SSO)</TableHead>
              <TableHead>Akses Aplikasi Satelit</TableHead>
              <TableHead>Status Akun</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span>Memuat data karyawan dari ZITADEL...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Tidak ada karyawan yang sesuai kriteria pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.type === "MACHINE" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                              Service
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-foreground font-medium">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1 items-center">
                      {user.apps && user.apps.length > 0 ? (
                        user.apps.map((appName) => (
                          <Badge
                            key={appName}
                            variant="outline"
                            className="text-[10px] px-2 py-0 border-border bg-secondary text-secondary-foreground"
                          >
                            {appName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Belum ada izin akses</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {user.state === "ACTIVE" ? (
                      <Badge variant="outline" className="gap-1 text-[11px] border-primary/20 bg-primary/10 text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>Aktif</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        <span>Nonaktif</span>
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => openManageAppsDialog(user)}
                          className="gap-2 text-xs cursor-pointer text-primary font-medium"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          <span>Kelola Akses Aplikasi</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUserForPin(user);
                            setIsResetPinOpen(true);
                          }}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Reset PIN 6-Digit</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleToggleState(user)}
                          className={`gap-2 text-xs cursor-pointer ${
                            user.state === "ACTIVE" ? "text-destructive hover:text-destructive" : "text-primary"
                          }`}
                        >
                          {user.state === "ACTIVE" ? (
                            <>
                              <UserX className="h-3.5 w-3.5 text-destructive" />
                              <span>Nonaktifkan Akun</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-primary" />
                              <span>Aktifkan Akun</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Dialog: Kelola Hak Akses Aplikasi */}
      <Dialog open={isManageAppsOpen} onOpenChange={setIsManageAppsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleSaveApps}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Hak Akses Aplikasi Satelit</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pilih aplikasi mana saja yang diizinkan untuk diakses oleh{" "}
                <strong>{selectedUserForApps?.name}</strong> melalui SSO ZITADEL.
              </DialogDescription>
            </DialogHeader>

            {manageAppsSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle className="h-10 w-10 text-primary mx-auto animate-bounce" />
                <p className="text-sm font-semibold text-primary">Hak Akses Berhasil Diperbarui!</p>
                <p className="text-xs text-muted-foreground">Izin akses di ZITADEL langsung disinkronkan.</p>
              </div>
            ) : (
              <>
                <div className="py-4 space-y-3">
                  <div className="space-y-2">
                    {SATELLITE_APPS.map((app) => {
                      const isChecked = targetApps.includes(app.name);
                      return (
                        <label
                          key={app.name}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:bg-accent text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTargetApps([...targetApps, app.name]);
                                } else {
                                  setTargetApps(targetApps.filter((a) => a !== app.name));
                                }
                              }}
                            />
                            <div>
                              <div className="text-xs font-semibold">{app.name}</div>
                              <div className="text-[10px] text-muted-foreground">Project ID: {app.id}</div>
                            </div>
                          </div>
                          <Badge
                            variant={isChecked ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {isChecked ? "Diberikan" : "Tidak Ada"}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    User hanya akan bisa login ke aplikasi yang dicentang.
                  </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManageAppsOpen(false)}
                    disabled={manageAppsSubmitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={manageAppsSubmitting}
                  >
                    {manageAppsSubmitting ? "Menyimpan ke ZITADEL..." : "Simpan Hak Akses"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Tambah Karyawan Baru */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleAddUser}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                Tambah Karyawan Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Karyawan akan didaftarkan ke ZITADEL IdP dan langsung dapat login via SSO menggunakan No. HP & PIN.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-medium">Nama Depan *</Label>
                  <Input
                    id="firstName"
                    placeholder="Budi"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-medium">Nama Belakang</Label>
                  <Input
                    id="lastName"
                    placeholder="Santoso"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Nomor Telepon (Username SSO) *</Label>
                <Input
                  id="phone"
                  placeholder="081234567890"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Nomor ini digunakan sebagai identitas login karyawan.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pin" className="text-xs font-medium">PIN Keamanan (6 Digit Angka) *</Label>
                <Input
                  id="pin"
                  type="password"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={newUser.pin}
                  onChange={(e) => setNewUser({ ...newUser, pin: e.target.value.replace(/\D/g, "") })}
                />
                <p className="text-[11px] text-muted-foreground">Digunakan sebagai kata sandi verifikasi saat login SSO.</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold text-foreground">Akses Aplikasi Satelit</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SATELLITE_APPS.map((app) => (
                    <label
                      key={app.name}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer text-xs font-medium"
                    >
                      <Checkbox
                        checked={newUser.apps.includes(app.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewUser({ ...newUser, apps: [...newUser.apps, app.name] });
                          } else {
                            setNewUser({ ...newUser, apps: newUser.apps.filter((a) => a !== app.name) });
                          }
                        }}
                      />
                      <span>{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddUserOpen(false)}
                disabled={submittingUser}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingUser}
              >
                {submittingUser ? "Mendaftarkan..." : "Simpan Karyawan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Reset PIN */}
      <Dialog open={isResetPinOpen} onOpenChange={setIsResetPinOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleResetPin}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Reset PIN Karyawan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ubah PIN untuk <strong>{selectedUserForPin?.name}</strong> ({selectedUserForPin?.phone}).
              </DialogDescription>
            </DialogHeader>

            {resetPinSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle className="h-10 w-10 text-primary mx-auto animate-bounce" />
                <p className="text-sm font-semibold text-primary">PIN Berhasil Diperbarui!</p>
                <p className="text-xs text-muted-foreground">Karyawan sekarang dapat login dengan PIN baru.</p>
              </div>
            ) : (
              <>
                <div className="py-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPin" className="text-xs font-medium">
                      PIN Baru (6 Digit) *
                    </Label>
                    <Input
                      id="newPin"
                      type="password"
                      maxLength={6}
                      placeholder="Contoh: 654321"
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Pastikan menginformasikan PIN baru ini langsung ke karyawan.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsResetPinOpen(false)}
                    disabled={resetPinSubmitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={resetPinSubmitting || newPin.length !== 6}
                  >
                    {resetPinSubmitting ? "Menyimpan..." : "Perbarui PIN"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
