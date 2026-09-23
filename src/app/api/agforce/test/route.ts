import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateTimestamp,
  generateSignature,
  getSignaturePayload,
  generateCurlCommand,
} from "@/lib/agforce-client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const cleanBaseUrl = (body.baseUrl || process.env.AGFORCE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
    const rawPath = body.endpointPath || "/api/v1/me";
    const endpointPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const method = (body.method || "GET").toUpperCase();
    const sourceKey = body.sourceKey || process.env.AGFORCE_SOURCE_KEY || "client_management";
    const secretKey = body.secretKey || process.env.AGFORCE_SECRET_KEY || "sec_cb724b2440262b7c04f805d7e806cab1";
    const rawBody = method === "GET" ? "" : (typeof body.rawBody === "string" ? body.rawBody : (body.rawBody ? JSON.stringify(body.rawBody) : ""));

    // Extract access token from user session or from custom token override
    const sessionToken = (session as unknown as Record<string, unknown>)?.accessToken as string | undefined;
    const token = (body.customToken && body.customToken.trim()) || sessionToken || "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          status: 401,
          statusText: "Unauthorized",
          error: "Access token tidak ditemukan. Silakan login ke SSO atau masukkan token manual pada kolom Custom Token.",
        },
        { status: 400 }
      );
    }

    const timestamp = generateTimestamp();
    const signature = generateSignature({
      source: sourceKey,
      timestamp,
      rawBody,
      endpointPath,
      secretKey,
      method,
    });

    const signaturePayload = getSignaturePayload({
      source: sourceKey,
      timestamp,
      rawBody,
      endpointPath,
      secretKey,
      method,
    });

    const targetUrl = `${cleanBaseUrl}${endpointPath}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "X-Source": sourceKey,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      "Content-Type": "application/json",
    };

    const startTime = performance.now();
    let responseStatus = 0;
    let responseStatusText = "";
    let responseData: any = null;
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
          signature,
          signaturePayload,
          maskedToken,
          headersSent: {
            ...headers,
            Authorization: `Bearer ${maskedToken}`,
          },
          curlCommand: generateCurlCommand({
            baseUrl: cleanBaseUrl,
            endpointPath,
            method,
            source: sourceKey,
            timestamp,
            signature,
            token,
            rawBody,
          }),
        },
      });
    } catch (err: any) {
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      let errorMessage = err.message || "Gagal menghubungi AGForce API";
      let isConnectionRefused = false;

      if (err.name === "AbortError") {
        errorMessage = "Request timeout setelah 10 detik";
      } else if (
        err.cause?.code === "ECONNREFUSED" ||
        err.code === "ECONNREFUSED" ||
        err.message?.includes("fetch failed") ||
        err.message?.includes("ECONNREFUSED")
      ) {
        isConnectionRefused = true;
        errorMessage = `Koneksi ditolak (${targetUrl}). Pastikan server AGForce sudah menyala di ${cleanBaseUrl}.`;
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
          signature,
          signaturePayload,
          maskedToken,
          headersSent: {
            ...headers,
            Authorization: `Bearer ${maskedToken}`,
          },
          curlCommand: generateCurlCommand({
            baseUrl: cleanBaseUrl,
            endpointPath,
            method,
            source: sourceKey,
            timestamp,
            signature,
            token,
            rawBody,
          }),
        },
      });
    }
  } catch (error: any) {
    console.error("[api/agforce/test] Internal handler error:", error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        error: error.message || "Terjadi kesalahan internal pada server proxy",
      },
      { status: 500 }
    );
  }
}
