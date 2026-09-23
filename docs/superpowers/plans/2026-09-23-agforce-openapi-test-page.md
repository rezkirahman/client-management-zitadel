# AGForce Open API Test Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive testing playground page (`/dashboard/api-test`) and server-side proxy route (`/api/agforce/test`) to test the AGForce Open API with dual-layer authentication (Zitadel SSO Bearer Token + HMAC SHA-256 Signature).

**Architecture:** A server-side Next.js route calculates the SHA-256 signature (`source + timestamp + rawBody + endpointPath + secretKey + METHOD`), injects the Zitadel session access token (or custom override token), and proxies the request to the AGForce API (default `http://localhost:8080/api/v1/me`). The frontend playground provides preset environment pickers, credential controls, latency and response viewer, signature breakdown, and cURL generation.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI components, NextAuth.js.

## Global Constraints

- **Source Key default:** `client_management`
- **Secret Key default:** `sec_cb724b2440262b7c04f805d7e806cab1`
- **Default Environment:** `http://localhost:8080` (Local / Dev)
- **Signature Formula:** `SHA256(source + timestamp + rawBody + endpointPath + secret_key + METHOD)`
- **Timestamp Format:** `YYYYMMDDHHmmss` (14 digits)
- **No secret leakage:** Secret keys are handled safely, with password-masked input on the UI.

---

### Task 1: Helper Utility & Signature Test Script

**Files:**
- Create: `src/lib/agforce-client.ts`
- Create: `scripts/test-agforce-client.ts`

**Interfaces:**
- Produces:
  ```ts
  export function generateTimestamp(date?: Date): string;
  export function generateSignature(params: {
    source: string;
    timestamp: string;
    rawBody?: string;
    endpointPath: string;
    secretKey: string;
    method: string;
  }): string;
  export function getSignaturePayload(params: {
    source: string;
    timestamp: string;
    rawBody?: string;
    endpointPath: string;
    secretKey: string;
    method: string;
  }): string;
  ```

- [ ] **Step 1: Write test script for signature calculation**
Create `scripts/test-agforce-client.ts` verifying timestamp length (14 chars) and known SHA-256 test vectors:
```ts
import { generateTimestamp, generateSignature, getSignaturePayload } from "../src/lib/agforce-client";
import assert from "assert";
import crypto from "crypto";

// Test 1: Timestamp format
const ts = generateTimestamp(new Date("2026-09-22T17:30:00Z"));
assert.strictEqual(ts.length, 14, "Timestamp must be 14 digits");

// Test 2: Formula calculation matches manual hash
const params = {
  source: "client_management",
  timestamp: "20260922173000",
  rawBody: "",
  endpointPath: "/api/v1/me",
  secretKey: "sec_cb724b2440262b7c04f805d7e806cab1",
  method: "GET"
};

const payload = getSignaturePayload(params);
assert.strictEqual(
  payload,
  "client_management20260922173000/api/v1/mesec_cb724b2440262b7c04f805d7e806cab1GET"
);

const expectedSignature = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
const generated = generateSignature(params);
assert.strictEqual(generated, expectedSignature);

console.log("✓ All agforce-client tests passed!");
```

- [ ] **Step 2: Run test to verify it fails (file not found)**
Run: `bun run scripts/test-agforce-client.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/lib/agforce-client.ts`**
Implement timestamp generation and SHA-256 signature helpers using Node.js `crypto`.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun run scripts/test-agforce-client.ts`
Expected: PASS with "✓ All agforce-client tests passed!"

- [ ] **Step 5: Commit**
```bash
git add src/lib/agforce-client.ts scripts/test-agforce-client.ts
git commit -m "feat(api): add agforce client signature helper and unit test"
```

---

### Task 2: Backend Proxy Endpoint (`/api/agforce/test`)

**Files:**
- Create: `src/app/api/agforce/test/route.ts`

**Interfaces:**
- Consumes: `generateTimestamp`, `generateSignature`, `getSignaturePayload` from `@/lib/agforce-client`, `authOptions` from `@/lib/auth`.
- Produces: POST endpoint returning:
  `{ success: boolean, status: number, statusText: string, latencyMs: number, data: any, debug: any }`

- [ ] **Step 1: Write `src/app/api/agforce/test/route.ts`**
Implement the route:
- Authenticate session with `getServerSession(authOptions)`
- Read payload: `baseUrl`, `endpointPath`, `method`, `sourceKey`, `secretKey`, `customToken`, `rawBody`
- Default fallbacks: `sourceKey || process.env.AGFORCE_SOURCE_KEY || 'client_management'`
- Compute signature and headers:
  - `Authorization: Bearer <token>`
  - `X-Source: <sourceKey>`
  - `X-Timestamp: <timestamp>`
  - `X-Signature: <signature>`
  - `Content-Type: application/json`
- Measure latency using `performance.now()`
- Fetch downstream with a 10s `AbortSignal.timeout(10000)`
- Catch network errors (like `ECONNREFUSED` if localhost:8080 isn't started) and return friendly error info rather than 500 crash.
- Return status, data, latency, headers, and debug payload.

- [ ] **Step 2: Commit**
```bash
git add src/app/api/agforce/test/route.ts
git commit -m "feat(api): add backend proxy route for AGForce Open API testing"
```

---

### Task 3: Update Environment Configurations

**Files:**
- Modify: `.env.local`
- Modify: `.env.local.example`

- [ ] **Step 1: Add configuration keys to `.env.local` and `.env.local.example`**
Add:
```env
# AGForce Open API Configuration
AGFORCE_API_BASE_URL="http://localhost:8080"
AGFORCE_SOURCE_KEY="client_management"
AGFORCE_SECRET_KEY="sec_cb724b2440262b7c04f805d7e806cab1"
```

- [ ] **Step 2: Commit**
```bash
git add .env.local.example
git commit -m "chore: add AGForce Open API configuration to env example"
```

---

### Task 4: Frontend UI Playground & Sidebar Integration

**Files:**
- Modify: `src/components/app-sidebar.tsx`
- Create: `src/app/dashboard/api-test/page.tsx`

- [ ] **Step 1: Add navigation item to `src/components/app-sidebar.tsx`**
Import `TerminalSquare` from `lucide-react` and add to `mainNavItems`:
```ts
{
  title: "API Tester (AGForce)",
  url: "/dashboard/api-test",
  icon: TerminalSquare,
  badge: "OpenAPI",
},
```

- [ ] **Step 2: Implement `src/app/dashboard/api-test/page.tsx`**
- Two-column responsive layout:
  - **Left column:**
    - SSO Session token display badge with copy button & override toggle.
    - Environment preset dropdown (`Local (http://localhost:8080)`, `Staging`, `Production`, `Custom`).
    - Base URL input (disabled unless Custom is chosen, or easily editable).
    - Endpoint path (`/api/v1/me`) and Method selector (`GET`, `POST`).
    - Source Key (`client_management`).
    - Secret Key with Show/Hide toggle.
    - Primary button: **"Hit AGForce API"** with loading spinner.
  - **Right column:**
    - Status badge with color coding (Green for 200, Yellow for 401/404, Red for 500/Network error).
    - Latency badge (e.g. `34 ms`).
    - Copy JSON Response button.
    - Syntax-styled JSON response viewer.
    - Expandable **Request Inspector & Signature Debugger**:
      - Formula string: `source + timestamp + rawBody + endpointPath + secretKey + METHOD`.
      - Raw payload before SHA-256.
      - Computed `X-Signature` hex.
      - "Copy cURL Command" button with the exact curl command.

- [ ] **Step 3: Commit**
```bash
git add src/components/app-sidebar.tsx src/app/dashboard/api-test/page.tsx
git commit -m "feat(ui): add AGForce API tester page and sidebar menu"
```

---

### Task 5: End-to-End Build & Verification

- [ ] **Step 1: Run unit tests**
Run: `bun run scripts/test-agforce-client.ts`
Expected: PASS.

- [ ] **Step 2: Run Next.js build**
Run: `bun run build` or `npm run build`
Expected: Build succeeds with 0 TypeScript and lint errors.
