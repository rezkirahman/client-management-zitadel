# Panduan Integrasi ZITADEL SSO: Dashboard Internal (Filament Laravel)

Dokumen ini berisi panduan teknis bagi tim pengembang **Filament Laravel** untuk menyinkronkan aksi CRUD User (Create, Edit Profil/No HP/Email/PIN, dan Delete/Deactivate) langsung ke **ZITADEL SSO Server** menggunakan **Service Account Key berbentuk Text di `.env` (Base64)** tanpa perlu menyimpan file fisik di server.

---

## 1. Kredensial & Konfigurasi `.env`

Tambahkan variabel berikut pada file `.env` Laravel:

```env
# ZITADEL Identity Provider (Production)
ZITADEL_ISSUER="https://sso.agforce.co.id"
ZITADEL_CLIENT_ID="390958723364902048"
ZITADEL_DEXTER_PROJECT_ID="390864790551024800"
ZITADEL_DEXTER_ROLE_KEY="4"

# Service Account Key (Base64 Text di .env - Tidak perlu file fisik)
ZITADEL_KEY_BASE64="eyJ0eXBlIjoic2VydmljZWFjY291bnQiLCJrZXlJZCI6IjM5MTI1MjE1NTY5ODMxMjk2NiIsImtleSI6Ii0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUVvd0lCQUFLQ0FRRUF4WFkzaE04MWd5K2ROeE51MDhQb1lBSk5ySFlnNlJXRnRUNUFQUEZnWUxIc1lQZ3NcblN3dm1hQVNaaXJDeU4zcDZqZFRMNmhIRTdaMDRUQTI2anREWDVrZlhhTVBtdHkwUjF4MjhDR2xJWE45ZkNuWWdcbjIrYUNUR3Vqbm9YRW05TmptQkd1UGhwOTFER3doSy8xT2ZBb0xUSmo2WE16aHFVSTkrQ0c5Z3B6blNYZXphMUFcbnR2b3BIVVdJQmpkakdFV25uZ216cmVoODdGTUUwcDkyZ0lzODkwaXJWcGQwNzN2cXVraXdIWkZwbGdzSWZ2TStcbk1xUGxQQVhodzVFSGZmdHBuTWxoL21MRmJaeENMclpRblI4K0pFSmZlRkhYVlp3SGVmaDNHb0RIQkZsS3B6M2lcbnpRU1FLUmJPNWhId1NqTzRTR3dDV2NXd21UK1hwWWNzL3FuV013SURBUUFCQW9JQkFGZ3ZGMVJFaFkxMHNpMXFcbmpGQWVhYVNXNHNGbWNBUW9ESEtJdm45NC9LV3lUL0p1WXJtUk12QzVQU2puQ0hBbVRwMFFyNUIxSnhGRzZXRnRcbnNDY2Z0WXV1QWRGVHk3RjZlMEVxa2xMZlVlWElDOVhNTTVpQk5TZVQycHBzK3dUc1Bzb20rejNZN3VEWTRCQWhcbjFNNXZKa0lwQXQyN0NRUFVxRkNyQVJyWVNCR2hreDdhWklDMksvLzVOTm9lazY2QWFsS3pHYXdzdUVRL3BVZHNcbi9kQnVnTi9VVlAzejllaUxFSThabmFheWRkNloyVXUxZW16RWM3Z3c3RkJCZWIwaEJWRTI1akNhamZ1Wk5JSExcbi9QQzUxelBvTEFJeUVIL0lNRk05aWZ4SUhreVNjdE1ZazF3eDU2UWkvRVRDQVRYalliK0V4eEZpYmZzL0x1VGZcbnNITDZWR0VDZ1lFQTV2ZlgxQWxLdUlwNC9rQkRsbGVKeWxtOHBjdkVSWWJQcnk3Qnp4bnIrcnFOMWlTLzZGTnBcbm9MZjB1OXNRYnJoUVl6WjF0OU9WMVdBTERjbi9QKzBhS2ErbHVoZkMxTjlITklHUlhsanNKTmRSV3VueW1wMC9cbmx2NkVGTWNxSGhiOWZUbXhTTkxvYmhVZGRZdWV4bEpyNnNPVnB3bndqMGhMQURqRWhvNmVzblVDZ1lFQTJ0eS9cbmRWUDlmVk11bVgwQ2FKeFB2MHBwU1JaMkRCTDZ1MXNBeFNDY1BRbnJDYWU5YWtoeHAzRERUNjJaSGJRenM1MDlcblZ3eVpzTjBwNm9mOFp3eUk2OHhJMmk1N1NSL1F1MHBvR1BTdlRha3NOM0VJNXBEanhLcCs4SDh4bnZ3ZDJJRmJcbmJGamc3Nyt6eXBMVVBGWkdkWUJOU2pnaUcyeDY0MCtwM2lZT2dRY0NnWUJwVHMyWVB0aFR4Y2NlM2J3ek94eDNcbkoyMHRCdmdwWHlzb1M2QlFSaGhqREZZSk1sNVJsbDZOeWZJTENQbTRFYytOUE5KMWkwSkF0SGExeGNqY284V1BcbkJpZ0E3ajZHQW51YnhBdTh3YnlCbTY3YlRkbXdoMHZzRTRXelY0K3JnbjMzYjZ1V2NadEtQZFJkdU5nZXdvdXpcbjBaTlZRdUhzNG1CWDdJb21jN2FGMVFLQmdCUFJGUXpjbEFFNi9PY3M2SURzVmxRdHVxYkJmK0xML1NQbHM0WWxcbjA3KzdIQ3I5b3lyeWNFZ0c3OGhSSWFJTTVQbUliVHRxaXFmMi9vcWIwWURMSThLbDlwcTZ4ckx5VElZSTBMQWhcbng1V3lrYXhiY2NEZXNhRG5CeU5qZ095eVMwbUZQTy9zaEVGeERDaDFidjRmbWJXZDdtR2YvNGFZSmZCYkVEaHJcbkhia1ZBb0dCQUxCREpNUGtKTGpDWHdMb1A4eXBHbjNuQ2RjNHVoUmd4RGxHeWlncmQ1MjdiSEt5bStzZjd2SFdcbnlQVk9BT0REZTZ4cW9jZ3pHcFRrKzFZaUpYUjY2d1NwZzJEWlIxWjJGdUZqVWdXbVlRYmJndVNLNzQwRVZtQ0pcbklZOUdhNFdHeHJ2eXo5Q2psS1hraVJtQWUzazkvem0rZXFVWnAwa0pIRWw0UllIRkx3OFNcbi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tXG4iLCJleHBpcmF0aW9uRGF0ZSI6Ijk5OTktMTItMzFUMjM6NTk6NTlaIiwidXNlcklkIjoiMzkxMjUyMDUzMjM5ODEzMjgwIn0="
```

Tambahkan ke `config/services.php`:

```php
'zitadel' => [
    'issuer' => env('ZITADEL_ISSUER', 'https://sso.agforce.co.id'),
    'client_id' => env('ZITADEL_CLIENT_ID', '390958723364902048'),
    'key_base64' => env('ZITADEL_KEY_BASE64'),
    'dexter_project_id' => env('ZITADEL_DEXTER_PROJECT_ID', '390864790551024800'),
    'dexter_role_key' => env('ZITADEL_DEXTER_ROLE_KEY', '4'),
],
```

---

## 2. Implementasi Service Laravel Siap Pakai

### File: `app/Services/ZitadelService.php`

Service ini otomatis membaca `ZITADEL_KEY_BASE64` dari `.env`, menandatangani JWT menggunakan fungsi bawaan PHP `openssl_sign`, dan menyimpan access token di Laravel Cache (`Cache::remember`).

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZitadelService
{
    protected string $issuer;
    protected ?string $keyBase64;
    protected string $dexterProjectId;
    protected string $dexterRoleKey;

    public function __construct()
    {
        $this->issuer = rtrim(config('services.zitadel.issuer'), '/');
        $this->keyBase64 = config('services.zitadel.key_base64');
        $this->dexterProjectId = config('services.zitadel.dexter_project_id');
        $this->dexterRoleKey = config('services.zitadel.dexter_role_key');
    }

    /**
     * Mendapatkan Bearer Access Token dari Key Base64 di .env (dengan Cache otomatis)
     */
    public function getAccessToken(): ?string
    {
        return Cache::remember('zitadel_sa_access_token', 3600 * 10, function () {
            if (empty($this->keyBase64)) {
                Log::error("ZITADEL_KEY_BASE64 belum diisi pada file .env");
                return null;
            }

            $jsonStr = base64_decode(trim($this->keyBase64));
            $keyData = json_decode($jsonStr, true);

            $keyId = $keyData['keyId'] ?? null;
            $userId = $keyData['userId'] ?? null;
            $privateKey = $keyData['key'] ?? null;

            if (!$keyId || !$userId || !$privateKey) {
                Log::error("Format ZITADEL_KEY_BASE64 tidak valid.");
                return null;
            }

            $now = time();
            $header = [
                'alg' => 'RS256',
                'kid' => $keyId,
                'typ' => 'JWT',
            ];
            $claims = [
                'iss' => $userId,
                'sub' => $userId,
                'aud' => $this->issuer,
                'iat' => $now,
                'exp' => $now + 3600,
            ];

            $b64Url = fn($data) => rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
            $unsignedToken = $b64Url(json_encode($header)) . '.' . $b64Url(json_encode($claims));

            $signature = '';
            if (!openssl_sign($unsignedToken, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
                Log::error("Gagal menandatangani assertion JWT ZITADEL.");
                return null;
            }

            $assertion = $unsignedToken . '.' . $b64Url($signature);

            $response = Http::asForm()->post("{$this->issuer}/oauth/v2/token", [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
                'scope' => 'openid profile email urn:zitadel:iam:org:project:id:zitadel:aud',
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error("ZITADEL Token Exchange Gagal: " . $response->body());
            return null;
        });
    }

    public function normalizePhone(string $rawPhone): array
    {
        $clean = preg_replace('/[^\d+]/', '', trim($rawPhone));
        $clean = ltrim($clean, '+');

        if (str_starts_with($clean, '62')) {
            $username = '0' . substr($clean, 2);
            $e164 = '+62' . substr($clean, 2);
        } elseif (str_starts_with($clean, '0')) {
            $username = $clean;
            $e164 = '+62' . substr($clean, 1);
        } else {
            $username = '0' . $clean;
            $e164 = '+62' . $clean;
        }

        return ['username' => $username, 'e164' => $e164];
    }

    public function createUser(array $data): ?string
    {
        $token = $this->getAccessToken();
        if (!$token) return null;

        $phoneData = $this->normalizePhone($data['phone']);
        $nameParts = explode(' ', trim($data['name'] ?? 'User'));
        $givenName = $nameParts[0] ?? 'User';
        $familyName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : $givenName;

        $email = trim($data['email'] ?? '');
        if (empty($email) || !str_contains($email, '@')) {
            $email = $phoneData['username'] . '@gmail.com';
        }

        $payload = [
            'username' => $phoneData['username'],
            'profile' => [
                'givenName' => $givenName,
                'familyName' => $familyName,
                'displayName' => $data['name'] ?? 'User',
                'gender' => $this->normalizeGender($data['gender'] ?? null),
            ],
            'phone' => [
                'phone' => $phoneData['e164'],
                'isVerified' => true,
            ],
            'email' => [
                'email' => $email,
                'isVerified' => true,
            ],
            'password' => [
                'password' => (string)$data['pin'],
            ],
        ];

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post("{$this->issuer}/v2/users/human", $payload);

            if ($response->successful()) {
                $zitadelId = $response->json('userId') ?? $response->json('id');
                if ($zitadelId) {
                    $this->grantDexterRole($zitadelId);
                }
                return $zitadelId;
            }

            Log::error("Gagal create user ZITADEL: " . $response->body());
        } catch (\Exception $e) {
            Log::error("ZITADEL Network Exception: " . $e->getMessage());
        }

        return null;
    }

    public function grantDexterRole(string $zitadelId): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        try {
            Http::withToken($token)
                ->timeout(5)
                ->post("{$this->issuer}/management/v1/users/{$zitadelId}/grants", [
                    'projectId' => $this->dexterProjectId,
                    'roleKeys' => [$this->dexterRoleKey],
                ]);
        } catch (\Exception $e) {
            Log::warning("Gagal grant role Dexter untuk Zitadel ID {$zitadelId}: " . $e->getMessage());
        }
    }

    public function updateProfile(string $zitadelId, string $name, ?string $gender = null): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        $nameParts = explode(' ', trim($name));
        $givenName = $nameParts[0] ?? 'User';
        $familyName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : $givenName;

        try {
            Http::withToken($token)
                ->timeout(5)
                ->patch("{$this->issuer}/v2/users/human/{$zitadelId}", [
                    'profile' => [
                        'givenName' => $givenName,
                        'familyName' => $familyName,
                        'displayName' => $name,
                        'gender' => $this->normalizeGender($gender),
                    ],
                ]);
        } catch (\Exception $e) {
            Log::error("Gagal update profile ZITADEL: " . $e->getMessage());
        }
    }

    public function updatePhone(string $zitadelId, string $phone): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        $phoneData = $this->normalizePhone($phone);
        try {
            Http::withToken($token)
                ->timeout(5)
                ->post("{$this->issuer}/v2/users/human/{$zitadelId}/phone", [
                    'phone' => $phoneData['e164'],
                    'isVerified' => true,
                ]);
        } catch (\Exception $e) {
            Log::error("Gagal update phone ZITADEL: " . $e->getMessage());
        }
    }

    public function updateEmail(string $zitadelId, string $email): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        try {
            Http::withToken($token)
                ->timeout(5)
                ->post("{$this->issuer}/v2/users/human/{$zitadelId}/email", [
                    'email' => trim($email),
                    'isVerified' => true,
                ]);
        } catch (\Exception $e) {
            Log::error("Gagal update email ZITADEL: " . $e->getMessage());
        }
    }

    public function changePin(string $zitadelId, string $plainPin): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        try {
            Http::withToken($token)
                ->timeout(5)
                ->post("{$this->issuer}/v2/users/human/{$zitadelId}/password", [
                    'password' => (string)$plainPin,
                    'changeRequired' => false,
                ]);
        } catch (\Exception $e) {
            Log::error("Gagal ganti PIN ZITADEL: " . $e->getMessage());
        }
    }

    public function deactivateUser(string $zitadelId): void
    {
        $token = $this->getAccessToken();
        if (!$token) return;

        try {
            Http::withToken($token)
                ->timeout(5)
                ->post("{$this->issuer}/v2/users/{$zitadelId}/deactivate", []);
        } catch (\Exception $e) {
            Log::error("Gagal deactivate ZITADEL: " . $e->getMessage());
        }
    }

    protected function normalizeGender(?string $g): string
    {
        $val = strtolower(trim($g ?? ''));
        return match ($val) {
            'm', 'male', 'pria', 'laki-laki' => 'GENDER_MALE',
            'f', 'female', 'wanita', 'perempuan' => 'GENDER_FEMALE',
            default => 'GENDER_UNSPECIFIED',
        };
    }
}
```

---

## 3. Model Observer & Registrasi

Model Observer `app/Observers/UserObserver.php` dan registrasinya di `AppServiceProvider.php` tetap sama seperti sebelumnya, karena `ZitadelService` secara otomatis menyembunyikan detail autentikasi token.
