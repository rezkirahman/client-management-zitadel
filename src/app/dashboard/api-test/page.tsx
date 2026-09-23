"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Clock,
  Terminal,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Code2,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface EnvironmentPreset {
  id: string;
  name: string;
  url: string;
  badge: string;
}

interface ApiTestResponse {
  success: boolean;
  status: number;
  statusText?: string;
  latencyMs?: number;
  data?: unknown;
  headers?: Record<string, string>;
  error?: string;
  isConnectionRefused?: boolean;
  debug?: {
    targetUrl: string;
    timestamp: string;
    source: string;
    signature: string;
    signaturePayload: string;
    maskedToken: string;
    headersSent: Record<string, string>;
    curlCommand: string;
  };
}

const PRESETS: EnvironmentPreset[] = [
  { id: "local", name: "Local / Dev", url: "http://localhost:8080", badge: "Dev" },
  { id: "staging", name: "Staging", url: "https://openapi-stg.agforce.co.id", badge: "Staging" },
  { id: "production", name: "Production", url: "https://openapi.agforce.co.id", badge: "Prod" },
  { id: "custom", name: "Custom URL", url: "", badge: "Custom" },
];

export default function ApiTestPage() {
  const { data: session } = useSession();

  // Environment & Request State
  const [selectedEnvId, setSelectedEnvId] = useState<string>("local");
  const [baseUrl, setBaseUrl] = useState<string>("http://localhost:8080");
  const [endpointPath, setEndpointPath] = useState<string>("/api/v1/me");
  const [httpMethod, setHttpMethod] = useState<string>("GET");
  const [sourceKey, setSourceKey] = useState<string>("client_management");
  const [secretKey, setSecretKey] = useState<string>("sec_cb724b2440262b7c04f805d7e806cab1");
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [requestBody, setRequestBody] = useState<string>("");

  // Token Override State
  const [overrideToken, setOverrideToken] = useState<boolean>(false);
  const [customToken, setCustomToken] = useState<string>("");

  // Execution & Response State
  const [loading, setLoading] = useState<boolean>(false);
  const [responseResult, setResponseResult] = useState<ApiTestResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showDebugDetail, setShowDebugDetail] = useState<boolean>(true);

  // Extract session token from all possible locations
  const rawSession = session as unknown as Record<string, unknown> | undefined;
  const rawUser = session?.user as Record<string, unknown> | undefined;
  const sessionToken =
    (rawSession?.accessToken as string | undefined) ||
    (rawSession?.idToken as string | undefined) ||
    (rawUser?.accessToken as string | undefined) ||
    (rawUser?.idToken as string | undefined) ||
    "";

  const activeToken = overrideToken ? customToken : (sessionToken || "");

  const handleSelectPreset = (preset: EnvironmentPreset) => {
    setSelectedEnvId(preset.id);
    if (preset.id !== "custom") {
      setBaseUrl(preset.url);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleHitApi = useCallback(async () => {
    setLoading(true);
    setResponseResult(null);

    try {
      const payload: Record<string, unknown> = {
        baseUrl: baseUrl.trim(),
        endpointPath: endpointPath.trim(),
        method: httpMethod,
        sourceKey: sourceKey.trim(),
        secretKey: secretKey.trim(),
      };

      if (overrideToken && customToken.trim()) {
        payload.customToken = customToken.trim();
      } else if (activeToken) {
        payload.sessionToken = activeToken.trim();
      }

      if (httpMethod !== "GET" && requestBody.trim()) {
        payload.rawBody = requestBody.trim();
      }

      const res = await fetch("/api/agforce/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiTestResponse;
      setResponseResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      setResponseResult({
        success: false,
        status: 0,
        statusText: "Client Exception",
        error: error?.message || "Gagal memproses request pengujian",
      });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, endpointPath, httpMethod, sourceKey, secretKey, overrideToken, customToken, activeToken, requestBody]);

  // Keyboard shortcut Ctrl + Enter to hit API
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleHitApi();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleHitApi]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Page */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AGForce Open API Tester
            </h1>
            <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/20">
              Dual-Layer Auth
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Playground pengujian integrasi AGForce Open API (Bearer Token Zitadel + HMAC SHA-256 Signature).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-9"
            onClick={() => {
              setBaseUrl("http://localhost:8080");
              setSelectedEnvId("local");
              setEndpointPath("/api/v1/me");
              setHttpMethod("GET");
              setSourceKey("client_management");
              setSecretKey("sec_cb724b2440262b7c04f805d7e806cab1");
              setOverrideToken(false);
              setCustomToken("");
              setResponseResult(null);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </Button>

          <Button
            size="sm"
            className="gap-2 h-9 font-semibold shadow-sm"
            onClick={handleHitApi}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            <span>{loading ? "Mengirim..." : "Hit AGForce API"}</span>
            <span className="hidden lg:inline text-[10px] font-normal opacity-70 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded">
              Ctrl+↵
            </span>
          </Button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* SSO Authentication Identity Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm font-semibold">User Identity (Layer 1)</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={
                    activeToken
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px]"
                  }
                >
                  {activeToken ? "SSO Token Active" : "No Session Token"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {session?.user?.name
                  ? `User: ${session.user.name}`
                  : "Access token JWT dari Zitadel SSO pengguna."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3 pt-0">
              <div className="rounded-md bg-muted/50 p-2.5 border border-border text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-muted-foreground">Bearer Token Preview</span>
                  {activeToken && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeToken, "token")}
                      className="text-primary hover:underline text-[11px] inline-flex items-center gap-1"
                    >
                      {copiedKey === "token" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" /> Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Salin Token
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="font-mono text-[11px] text-foreground truncate select-all bg-background px-2 py-1.5 rounded border border-border">
                  {activeToken ? `${activeToken.substring(0, 32)}...` : "— Tidak ada token aktif —"}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="override-token"
                  checked={overrideToken}
                  onCheckedChange={(c) => setOverrideToken(Boolean(c))}
                />
                <Label htmlFor="override-token" className="text-xs font-normal cursor-pointer select-none">
                  Override dengan Custom Zitadel Token
                </Label>
              </div>

              {overrideToken && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <Label className="text-xs font-medium">Custom Access Token</Label>
                  <Input
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="eyJhbGciOiJSUzI1Ni..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Masukkan token JWT mentah tanpa awalan &quot;Bearer &quot;.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Environment & Endpoint Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold">Target Environment</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4 pt-0">
              {/* Preset Selector Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pilih Environment:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = selectedEnvId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between gap-1 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-foreground font-medium"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground">{p.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              p.id === "local"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : p.id === "staging"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : p.id === "production"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        {p.url && (
                          <span className="font-mono text-[10px] truncate text-muted-foreground opacity-80">
                            {p.url}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Base URL Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    if (selectedEnvId !== "custom") setSelectedEnvId("custom");
                  }}
                  placeholder="http://localhost:8080"
                  className="font-mono text-xs"
                />
              </div>

              {/* Method & Endpoint Path */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1 space-y-1.5">
                  <Label className="text-xs font-medium">Method</Label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="col-span-3 space-y-1.5">
                  <Label className="text-xs font-medium">Endpoint Path</Label>
                  <Input
                    value={endpointPath}
                    onChange={(e) => setEndpointPath(e.target.value)}
                    placeholder="/api/v1/me"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Request Body (only for non-GET) */}
              {httpMethod !== "GET" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Request Body (JSON)</Label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={4}
                    placeholder='{"key": "value"}'
                    className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-ring resize-y"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credentials Card (Application Identity - Layer 2) */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-sm font-semibold">Application Credentials (Layer 2)</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">HMAC SHA-256</Badge>
              </div>
              <CardDescription className="text-xs">
                Kredensial untuk kalkulasi header <code className="font-mono">X-Signature</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3 pt-0">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Source Key (X-Source)</Label>
                <Input
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                  placeholder="client_management"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Secret Key</Label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showSecret ? "Sembunyikan" : "Tampilkan"}</span>
                  </button>
                </div>
                <Input
                  type={showSecret ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sec_..."
                  className="font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Inspector & Response (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Response Container */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Response Viewer</CardTitle>
                </div>

                {responseResult && (
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <Badge
                      className={`font-mono text-xs px-2.5 py-0.5 font-bold ${
                        responseResult.status >= 200 && responseResult.status < 300
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : responseResult.status === 401 || responseResult.status === 403
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : responseResult.status === 404
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-rose-500 text-white hover:bg-rose-600"
                      }`}
                    >
                      {responseResult.status > 0
                        ? `${responseResult.status} ${responseResult.statusText || ""}`
                        : responseResult.statusText || "ERR"}
                    </Badge>

                    {/* Latency */}
                    {typeof responseResult.latencyMs === "number" && (
                      <Badge variant="outline" className="text-xs font-mono gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{responseResult.latencyMs} ms</span>
                      </Badge>
                    )}

                    {/* Copy JSON */}
                    {responseResult.data !== undefined && responseResult.data !== null && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 px-2"
                        onClick={() =>
                          copyToClipboard(
                            typeof responseResult.data === "object"
                              ? JSON.stringify(responseResult.data, null, 2)
                              : String(responseResult.data),
                            "response-json"
                          )
                        }
                      >
                        {copiedKey === "response-json" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" /> Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Salin JSON
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {/* Empty State */}
              {!responseResult && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg bg-muted/20">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Siap Menguji API</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Klik tombol <strong>Hit AGForce API</strong> di atas untuk memanggil endpoint dan memeriksa hasil validasi dual-layer auth.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg bg-muted/20">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
                  <p className="text-xs font-medium text-foreground">
                    Menghitung signature & menghubungi <code className="font-mono">{baseUrl}{endpointPath}</code>...
                  </p>
                </div>
              )}

              {/* Offline / ECONNREFUSED Notice */}
              {responseResult?.isConnectionRefused && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Backend Lokal Belum Berjalan</p>
                      <p className="text-[11px] leading-relaxed">
                        Server tujuan <code className="font-mono bg-amber-500/20 px-1 rounded">{baseUrl}</code> menolak koneksi (ECONNREFUSED).
                        Pastikan aplikasi backend AGForce sudah Anda jalankan secara lokal di port 8080, atau ganti environment ke <strong>Staging</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {responseResult?.error && !responseResult.data && (
                <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Request Error</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{responseResult.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Response View */}
              {responseResult?.data !== undefined && responseResult?.data !== null && (
                <div className="relative rounded-lg border border-border bg-stone-950 text-stone-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-800 bg-stone-900/70 text-[11px] text-stone-400">
                    <span className="font-mono">Payload Body</span>
                    <span>JSON</span>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed text-emerald-400">
                    {typeof responseResult.data === "object"
                      ? JSON.stringify(responseResult.data, null, 2)
                      : String(responseResult.data)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Inspector & Signature Debugger Card */}
          {responseResult?.debug && (
            <Card className="border-border shadow-xs">
              <CardHeader
                className="pb-3 pt-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setShowDebugDetail(!showDebugDetail)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm font-semibold">
                      Inspect Signature & Request Details
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (responseResult.debug?.curlCommand) {
                          copyToClipboard(responseResult.debug.curlCommand, "curl");
                        }
                      }}
                    >
                      {copiedKey === "curl" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" /> Disalin
                        </>
                      ) : (
                        <>
                          <Terminal className="h-3 w-3" /> Copy cURL
                        </>
                      )}
                    </Button>
                    {showDebugDetail ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {showDebugDetail && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3.5 text-xs">
                  <Separator />

                  {/* Signature Breakdown Formula */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Rumus X-Signature
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        SHA256(source + timestamp + rawBody + endpointPath + secretKey + METHOD)
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-muted/40 border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Raw Concatenated String (Sebelum Di-hash):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (responseResult.debug?.signaturePayload) {
                              copyToClipboard(responseResult.debug.signaturePayload, "raw-payload");
                            }
                          }}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedKey === "raw-payload" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Salin
                        </button>
                      </div>
                      <div className="font-mono text-[11px] break-all bg-background p-2 rounded border border-border select-all text-amber-600 dark:text-amber-400">
                        {responseResult.debug.signaturePayload}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-muted/40 border border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Computed X-Signature (SHA-256 Hex Digest):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (responseResult.debug?.signature) {
                              copyToClipboard(responseResult.debug.signature, "sig-hex");
                            }
                          }}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedKey === "sig-hex" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Salin
                        </button>
                      </div>
                      <div className="font-mono text-[11px] break-all bg-background p-2 rounded border border-border select-all font-bold text-foreground">
                        {responseResult.debug.signature}
                      </div>
                    </div>
                  </div>

                  {/* Headers Sent */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      HTTP Request Headers Terkirim
                    </Label>
                    <div className="rounded border border-border overflow-hidden">
                      <table className="w-full text-[11px] font-mono">
                        <tbody>
                          {Object.entries(responseResult.debug.headersSent || {}).map(([key, val]) => (
                            <tr key={key} className="border-b last:border-b-0 border-border">
                              <td className="px-2.5 py-1.5 bg-muted/30 font-semibold text-muted-foreground w-1/3">
                                {key}
                              </td>
                              <td className="px-2.5 py-1.5 break-all text-foreground select-all">
                                {String(val)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* cURL Command Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        cURL Command (Siap Dijalankan di Terminal)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          if (responseResult.debug?.curlCommand) {
                            copyToClipboard(responseResult.debug.curlCommand, "curl-box");
                          }
                        }}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        {copiedKey === "curl-box" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" /> Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Salin Command
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 rounded bg-stone-950 text-stone-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all border border-stone-800">
                      {responseResult.debug.curlCommand}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
