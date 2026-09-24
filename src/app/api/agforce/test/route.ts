import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import {
  generateTimestamp,
  generateSignature,
  getSignaturePayload,
  generateCurlCommand,
  isSignatureRequired,
} from "@/lib/agforce-client";

interface TestRequestPayload {
  baseUrl?: string;
  endpointPath?: string;
  method?: string;
  sourceKey?: string;
  secretKey?: string;
  customToken?: string;
  sessionToken?: string;
  rawBody?: unknown;
  requireSignature?: boolean;
}

const cleanEnv = (val?: string) => (val || "").replace(/^["']|["']$/g, "").trim();
const NEXTAUTH_SECRET = cleanEnv(process.env.NEXTAUTH_SECRET) || "agforce-sso-portal-secret-key-super-secure-2026";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let body: TestRequestPayload = {};
    try {
      body = (await req.json()) as TestRequestPayload;
    } catch {
      body = {};
    }

    const cleanBaseUrl = (body.baseUrl || process.env.AGFORCE_API_BASE_URL || "https://api.agforce.co.id").replace(/\/+$/, "");
    const rawPath = body.endpointPath || "/api/v1/me";
    const fullEndpoint = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    
    // Separate path from query parameters
    const [pathOnly, queryString] = fullEndpoint.split("?");
    const queryParams: Record<string, string> = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((val, key) => {
        queryParams[key] = val;
      });
    }

    const method = (body.method || "GET").toUpperCase();
    const sourceKey = body.sourceKey || process.env.AGFORCE_SOURCE_KEY || "client_management";
    const secretKey = body.secretKey || process.env.AGFORCE_SECRET_KEY || "sec_cb724b2440262b7c04f805d7e806cab1";
    const rawBody = method === "GET" ? "" : (typeof body.rawBody === "string" ? body.rawBody : (body.rawBody ? JSON.stringify(body.rawBody) : ""));

    // Extract access token from all possible sources
    const rawSession = session as unknown as Record<string, unknown> | null;
    const rawUser = session?.user as Record<string, unknown> | undefined;

    // Try getToken with various secureCookie configurations
    let jwtToken = await getToken({ req, secret: NEXTAUTH_SECRET });
    if (!jwtToken) {
      jwtToken = await getToken({ req, secret: NEXTAUTH_SECRET, secureCookie: true });
    }
    if (!jwtToken) {
      jwtToken = await getToken({ req, secret: NEXTAUTH_SECRET, secureCookie: false });
    }

    const token =
      (body.customToken && body.customToken.trim()) ||
      (body.sessionToken && String(body.sessionToken).trim()) ||
      (rawSession?.accessToken as string | undefined) ||
      (rawSession?.idToken as string | undefined) ||
      (rawUser?.accessToken as string | undefined) ||
      (rawUser?.idToken as string | undefined) ||
      (jwtToken?.accessToken as string | undefined) ||
      (jwtToken?.idToken as string | undefined) ||
      "";

    console.log("[api/agforce/test] Token resolution:", {
      hasBodyCustomToken: !!body.customToken,
      hasBodySessionToken: !!body.sessionToken,
      hasSession: !!session,
      resolvedTokenLength: token.length,
      endpoint: pathOnly,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          status: 401,
          statusText: "Unauthorized",
          error: "Access token tidak ditemukan dari sesi SSO Anda. Pastikan Anda sudah login atau masukkan token secara manual.",
        },
        { status: 400 }
      );
    }

    const timestamp = generateTimestamp();

    // Check whether X-Signature is required (Tier 1 vs Tier 2)
    const sendSignature = typeof body.requireSignature === "boolean"
      ? body.requireSignature
      : isSignatureRequired(pathOnly);

    let signature = "";
    let signaturePayload = "";

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "X-Source": sourceKey,
      "X-Timestamp": timestamp,
      "Content-Type": "application/json",
    };

    if (sendSignature) {
      signature = generateSignature({
        source: sourceKey,
        timestamp,
        rawBody,
        endpointPath: pathOnly,
        queryParams,
        secretKey,
        method,
      });

      signaturePayload = getSignaturePayload({
        source: sourceKey,
        timestamp,
        rawBody,
        endpointPath: pathOnly,
        queryParams,
        secretKey,
        method,
      });

      headers["X-Signature"] = signature;
    } else {
      signaturePayload = "(Endpoint ini Tier 1: Tidak memerlukan header X-Signature)";
    }

    const targetUrl = `${cleanBaseUrl}${fullEndpoint}`;

    const startTime = performance.now();
    let responseStatus = 0;
    let responseStatusText = "";
    let responseData: unknown = null;
    const responseHeaders: Record<string, string> = {};

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(targetUrl, {
        method,
        headers,
        body: method === "GET" ? undefined : rawBody,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      responseStatus = res.status;
      responseStatusText = res.statusText || (res.ok ? "OK" : `HTTP ${res.status}`);

      res.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const text = await res.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }

      const maskedToken = token.length > 25
        ? `${token.substring(0, 12)}...${token.substring(token.length - 8)}`
        : token;

      return NextResponse.json({
        success: res.ok,
        status: responseStatus,
        statusText: responseStatusText,
        latencyMs,
        data: responseData,
        headers: responseHeaders,
        debug: {
          targetUrl,
          timestamp,
          source: sourceKey,
          signatureRequired: sendSignature,
          signature: sendSignature ? signature : null,
          signaturePayload,
          maskedToken,
          headersSent: {
            ...headers,
            Authorization: `Bearer ${maskedToken}`,
          },
          curlCommand: generateCurlCommand({
            baseUrl: cleanBaseUrl,
            endpointPath: pathOnly,
            queryParams,
            method,
            source: sourceKey,
            timestamp,
            signature: sendSignature ? signature : undefined,
            token,
            rawBody,
          }),
        },
      });
    } catch (err: unknown) {
      const errorObj = err as Error & { cause?: { code?: string }; code?: string };
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      let errorMessage = errorObj.message || "Gagal menghubungi AGForce API";
      let isConnectionRefused = false;

      if (errorObj.name === "AbortError") {
        errorMessage = "Request timeout setelah 10 detik";
      } else if (
        errorObj.cause?.code === "ECONNREFUSED" ||
        errorObj.code === "ECONNREFUSED" ||
        errorObj.message?.includes("fetch failed") ||
        errorObj.message?.includes("ECONNREFUSED")
      ) {
        isConnectionRefused = true;
        errorMessage = `Koneksi ditolak (${targetUrl}). Pastikan server tujuan dapat diakses di ${cleanBaseUrl}.`;
      }

      const maskedToken = token.length > 25
        ? `${token.substring(0, 12)}...${token.substring(token.length - 8)}`
        : token;

      return NextResponse.json({
        success: false,
        status: 0,
        statusText: isConnectionRefused ? "ECONNREFUSED" : "Network Error",
        latencyMs,
        error: errorMessage,
        isConnectionRefused,
        debug: {
          targetUrl,
          timestamp,
          source: sourceKey,
          signatureRequired: sendSignature,
          signature: sendSignature ? signature : null,
          signaturePayload,
          maskedToken,
          headersSent: {
            ...headers,
            Authorization: `Bearer ${maskedToken}`,
          },
          curlCommand: generateCurlCommand({
            baseUrl: cleanBaseUrl,
            endpointPath: pathOnly,
            queryParams,
            method,
            source: sourceKey,
            timestamp,
            signature: sendSignature ? signature : undefined,
            token,
            rawBody,
          }),
        },
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[api/agforce/test] Internal handler error:", err);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        error: err?.message || "Terjadi kesalahan internal pada server proxy",
      },
      { status: 500 }
    );
  }
}
