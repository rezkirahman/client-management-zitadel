# Design Specification: AGForce Open API Test Playground

**Date:** 2026-09-23  
**Status:** Approved by User  
**Target:** Add an interactive testing playground page and proxy endpoint for the AGForce Open API with dual-layer authentication (Zitadel Bearer Token + HMAC SHA-256 Signature).

---

## 1. Background & Objectives

External applications (such as Client Management, Dexter, Venturis) integrate with **AGForce Open API** using a dual-layer authentication scheme:
1. **User Identity:** Zitadel SSO JWT access token in the `Authorization: Bearer <token>` header.
2. **Application Identity:** SHA-256 hash in `X-Signature` header calculated from:
   $$\text{SHA256}(\text{source} + \text{timestamp} + \text{rawBody} + \text{endpointPath} + \text{secret\_key} + \text{METHOD})$$
   accompanied by `X-Source` and `X-Timestamp` (format: `YYYYMMDDHHmmss`).

To facilitate rapid local and staging testing, we are adding an **API Tester Page** to the existing `sso-client-management` dashboard. This page allows developers to hit the AGForce API (such as `GET /api/v1/me`), inspect signatures, view responses, and copy ready-to-run `curl` commands.

---

## 2. Configuration Defaults

- **Source Key:** `client_management`
- **Secret Key:** `sec_cb724b2440262b7c04f805d7e806cab1`
- **Default Base URL:** `http://localhost:8080` (Local / Dev)
- **Selectable Environments:**
  - `Local / Dev`: `http://localhost:8080`
  - `Staging`: `https://openapi-stg.agforce.co.id`
  - `Production`: `https://openapi.agforce.co.id`
  - `Custom`: Custom base URL input
- **Default Endpoint:** `GET /api/v1/me`

---

## 3. Architecture & Data Flow

```
[Browser / User]
       │
       ▼ (Clicks "Hit API")
[Page: /dashboard/api-test]
       │
       │ POST /api/agforce/test
       │ Body: { baseUrl, endpointPath, method, sourceKey, secretKey, customToken, rawBody }
       ▼
[Next.js API Route: src/app/api/agforce/test/route.ts]
       │
       ├─► 1. Extract active Zitadel accessToken from getServerSession(authOptions) (or customToken)
       ├─► 2. Generate timestamp: YYYYMMDDHHmmss (using local/UTC server time)
       ├─► 3. Compute X-Signature = SHA256(source + timestamp + rawBody + endpointPath + secretKey + METHOD)
       ├─► 4. Measure latency: performance.now()
       ├─► 5. Dispatch fetch request to target baseUrl + endpointPath with required headers
       │
       ▼
[AGForce Open API Backend (e.g. http://localhost:8080)]
       │
       ▼
[Next.js API Route parses response and returns to Frontend UI]
       │
       ▼
[Frontend: Displays Status Badge, Latency, Formatted JSON, Signature Formula breakdown, & cURL button]
```

---

## 4. Components & File Changes

### 4.1. Helper Library: `src/lib/agforce-client.ts`
- `generateTimestamp(date?: Date): string`
  - Returns current time in `YYYYMMDDHHmmss` format (14 digits).
- `generateSignature(params: { source: string; timestamp: string; rawBody?: string; endpointPath: string; secretKey: string; method: string }): string`
  - Concatenates `source + timestamp + (rawBody || '') + endpointPath + secretKey + method.toUpperCase()`
  - Computes SHA-256 digest in hex encoding using Node.js `crypto` module.
- `getSignaturePayload(params: ...): string`
  - Returns the raw concatenated string for inspection and debugging.

### 4.2. API Proxy Endpoint: `src/app/api/agforce/test/route.ts`
- **Method:** `POST`
- **Authentication:** Protected by NextAuth session; retrieves `session.accessToken`.
- **Request Parameters (JSON):**
  - `baseUrl`: string (default `http://localhost:8080`)
  - `endpointPath`: string (default `/api/v1/me`)
  - `method`: string (`GET`, `POST`, etc.)
  - `sourceKey`: string (default `client_management`)
  - `secretKey`: string (default `sec_cb724b2440262b7c04f805d7e806cab1`)
  - `customToken`: optional string to override current session token
  - `rawBody`: optional string
- **Response Format:**
  ```json
  {
    "success": true,
    "status": 200,
    "statusText": "OK",
    "latencyMs": 42,
    "data": { ... },
    "debug": {
      "targetUrl": "http://localhost:8080/api/v1/me",
      "timestamp": "20260923131500",
      "source": "client_management",
      "signature": "c80b18f8e87...",
      "signaturePayload": "client_management20260923131500/api/v1/mesec_cb724b2440262b7c04f805d7e806cab1GET",
      "curlCommand": "curl -X GET ...",
      "headersSent": {
        "Authorization": "Bearer eyJhbG...",
        "X-Source": "client_management",
        "X-Timestamp": "20260923131500",
        "X-Signature": "c80b18f8e87...",
        "Content-Type": "application/json"
      }
    }
  }
  ```
- **Error Handling:**
  - If AGForce returns 401/404/500, returns HTTP 200 with the exact error response in `data` and target `status` in payload, so the frontend UI can display the error badge and body.
  - If network fails (`fetch` throws e.g. `ECONNREFUSED`), returns a structured response indicating the target server is unreachable (with helpful advice like checking if `localhost:8080` is running).

### 4.3. User Interface: `src/app/dashboard/api-test/page.tsx`
- Responsive 2-column layout:
  - **Left Column:**
    - SSO Session status card (shows active user name, truncated access token, and override option).
    - Environment presets dropdown (`Local 8080`, `Staging`, `Production`, `Custom`).
    - Base URL input (editable when custom).
    - Endpoint path (`/api/v1/me`) and Method selector.
    - Credentials section: `Source Key` and `Secret Key` (masked input with show/hide toggle).
    - Primary action button: **"Hit AGForce API"** with loading state.
  - **Right Column:**
    - Empty state when no test has been executed yet.
    - Result card when executed:
      - Status code badge (`200 OK` in green, `401 Unauthorized` in yellow, `500` or Network Error in red).
      - Latency badge (e.g. `45 ms`).
      - "Copy JSON" button.
      - Pretty-printed JSON viewer with syntax highlighting.
      - **"Inspect Signature & Debug"** expandable card:
        - Signature formula: `source + timestamp + rawBody + endpointPath + secretKey + METHOD`.
        - Raw Payload string for verification.
        - Resulting SHA-256 hash.
        - One-click **"Copy cURL Command"** button.

### 4.4. Sidebar Navigation: `src/components/app-sidebar.tsx`
- Add to `mainNavItems`:
  ```ts
  {
    title: "API Tester (AGForce)",
    url: "/dashboard/api-test",
    icon: TerminalSquare,
    badge: "OpenAPI",
  }
  ```

### 4.5. Environment Variables: `.env.local` & `.env.local.example`
- Add default fallback keys:
  ```env
  AGFORCE_API_BASE_URL="http://localhost:8080"
  AGFORCE_SOURCE_KEY="client_management"
  AGFORCE_SECRET_KEY="sec_cb724b2440262b7c04f805d7e806cab1"
  ```

---

## 5. Verification & Testing Plan
1. **Signature Test:** Unit test helper function `generateSignature` against a known string formula to ensure proper SHA-256 calculation.
2. **Local Server Test:** Verify hitting `http://localhost:8080/api/v1/me`. If local server is not running, verify graceful network error message (`ECONNREFUSED`).
3. **Staging / Remote Test:** Switch environment to `https://openapi-stg.agforce.co.id` and execute test with Zitadel access token.
4. **Token Override Test:** Test with invalid token / modified secret key to confirm error response display (`401 invalid signature` or `401 unauthorized`).
