# Rangkuman Kredensial & Panduan Integrasi ZITADEL SSO Agforce

Dokumen ini berisi informasi kredensial produksi ZITADEL berbasis **Service Account Key (Bisa berupa text di .env / Base64 / File)** dan panduan integrasi arsitektur sinkronisasi data user (*Dual-Write / Direct Sync*) antara database **PostgreSQL Agforce** dan **ZITADEL SSO Server**.

---

## 1. Master Kredensial Produksi

### A. Format Text di `.env` (Paling Praktis, Tanpa File Fisik)
Agar tidak perlu menyimpan file fisik di server/container Docker, Key JSON telah di-encode menjadi **Base64 satu baris**. Cukup copy variabel ini ke file `.env` aplikasi Anda:

```env
# ZITADEL Production Configuration
ZITADEL_ISSUER="https://sso.agforce.co.id"
ZITADEL_CLIENT_ID="390958723364902048"
ZITADEL_DEXTER_PROJECT_ID="390864790551024800"
ZITADEL_DEXTER_ROLE_KEY="4"

# Service Account Key (Base64) - Tidak perlu simpan file fisik
ZITADEL_KEY_BASE64="eyJ0eXBlIjoic2VydmljZWFjY291bnQiLCJrZXlJZCI6IjM5MTI1MjE1NTY5ODMxMjk2NiIsImtleSI6Ii0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUVvd0lCQUFLQ0FRRUF4WFkzaE04MWd5K2ROeE51MDhQb1lBSk5ySFlnNlJXRnRUNUFQUEZnWUxIc1lQZ3NcblN3dm1hQVNaaXJDeU4zcDZqZFRMNmhIRTdaMDRUQTI2anREWDVrZlhhTVBtdHkwUjF4MjhDR2xJWE45ZkNuWWdcbjIrYUNUR3Vqbm9YRW05TmptQkd1UGhwOTFER3doSy8xT2ZBb0xUSmo2WE16aHFVSTkrQ0c5Z3B6blNYZXphMUFcbnR2b3BIVVdJQmpkakdFV25uZ216cmVoODdGTUUwcDkyZ0lzODkwaXJWcGQwNzN2cXVraXdIWkZwbGdzSWZ2TStcbk1xUGxQQVhodzVFSGZmdHBuTWxoL21MRmJaeENMclpRblI4K0pFSmZlRkhYVlp3SGVmaDNHb0RIQkZsS3B6M2lcbnpRU1FLUmJPNWhId1NqTzRTR3dDV2NXd21UK1hwWWNzL3FuV013SURBUUFCQW9JQkFGZ3ZGMVJFaFkxMHNpMXFcbmpGQWVhYVNXNHNGbWNBUW9ESEtJdm45NC9LV3lUL0p1WXJtUk12QzVQU2puQ0hBbVRwMFFyNUIxSnhGRzZXRnRcbnNDY2Z0WXV1QWRGVHk3RjZlMEVxa2xMZlVlWElDOVhNTTVpQk5TZVQycHBzK3dUc1Bzb20rejNZN3VEWTRCQWhcbjFNNXZKa0lwQXQyN0NRUFVxRkNyQVJyWVNCR2hreDdhWklDMksvLzVOTm9lazY2QWFsS3pHYXdzdUVRL3BVZHNcbi9kQnVnTi9VVlAzejllaUxFSThabmFheWRkNloyVXUxZW16RWM3Z3c3RkJCZWIwaEJWRTI1akNhamZ1Wk5JSExcbi9QQzUxelBvTEFJeUVIL0lNRk05aWZ4SUhreVNjdE1ZazF3eDU2UWkvRVRDQVRYalliK0V4eEZpYmZzL0x1VGZcbnNITDZWR0VDZ1lFQTV2ZlgxQWxLdUlwNC9rQkRsbGVKeWxtOHBjdkVSWWJQcnk3Qnp4bnIrcnFOMWlTLzZGTnBcbm9MZjB1OXNRYnJoUVl6WjF0OU9WMVdBTERjbi9QKzBhS2ErbHVoZkMxTjlITklHUlhsanNKTmRSV3VueW1wMC9cbmx2NkVGTWNxSGhiOWZUbXhTTkxvYmhVZGRZdWV4bEpyNnNPVnB3bndqMGhMQURqRWhvNmVzblVDZ1lFQTJ0eS9cbmRWUDlmVk11bVgwQ2FKeFB2MHBwU1JaMkRCTDZ1MXNBeFNDY1BRbnJDYWU5YWtoeHAzRERUNjJaSGJRenM1MDlcblZ3eVpzTjBwNm9mOFp3eUk2OHhJMmk1N1NSL1F1MHBvR1BTdlRha3NOM0VJNXBEanhLcCs4SDh4bnZ3ZDJJRmJcbmJGamc3Nyt6eXBMVVBGWkdkWUJOU2pnaUcyeDY0MCtwM2lZT2dRY0NnWUJwVHMyWVB0aFR4Y2NlM2J3ek94eDNcbkoyMHRCdmdwWHlzb1M2QlFSaGhqREZZSk1sNVJsbDZOeWZJTENQbTRFYytOUE5KMWkwSkF0SGExeGNqY284V1BcbkJpZ0E3ajZHQW51YnhBdTh3YnlCbTY3YlRkbXdoMHZzRTRXelY0K3JnbjMzYjZ1V2NadEtQZFJkdU5nZXdvdXpcbjBaTlZRdUhzNG1CWDdJb21jN2FGMVFLQmdCUFJGUXpjbEFFNi9PY3M2SURzVmxRdHVxYkJmK0xML1NQbHM0WWxcbjA3KzdIQ3I5b3lyeWNFZ0c3OGhSSWFJTTVQbUliVHRxaXFmMi9vcWIwWURMSThLbDlwcTZ4ckx5VElZSTBMQWhcbng1V3lrYXhiY2NEZXNhRG5CeU5qZ095eVMwbUZQTy9zaEVGeERDaDFidjRmbWJXZDdtR2YvNGFZSmZCYkVEaHJcbkhia1ZBb0dCQUxCREpNUGtKTGpDWHdMb1A4eXBHbjNuQ2RjNHVoUmd4RGxHeWlncmQ1MjdiSEt5bStzZjd2SFdcbnlQVk9BT0REZTZ4cW9jZ3pHcFRrKzFZaUpYUjY2d1NwZzJEWlIxWjJGdUZqVWdXbVlRYmJndVNLNzQwRVZtQ0pcbklZOUdhNFdHeHJ2eXo5Q2psS1hraVJtQWUzazkvem0rZXFVWnAwa0pIRWw0UllIRkx3OFNcbi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tXG4iLCJleHBpcmF0aW9uRGF0ZSI6Ijk5OTktMTItMzFUMjM6NTk6NTlaIiwidXNlcklkIjoiMzkxMjUyMDUzMjM5ODEzMjgwIn0="
```

### B. Metadata Key Asli
* **Key ID (`keyId`)**: `391252155698312966`
* **Service Account User ID (`userId`)**: `391252053239813280`
* **Masa Berlaku Kunci**: Tidak pernah kedaluwarsa (*expires: 9999-12-31*)
* **File Cadangan Fisik**: `C:\AGFORCE\zitadel-key\391252155698312966.json`

---

## 2. Keuntungan Format Base64 di `.env`
1. **Bisa Langsung Ditempel di `.env`**: Tidak perlu mount volume atau copy file JSON ke dalam container Docker/server.
2. **Aman dari Karakter Newline & Escape**: Private Key RSA memiliki banyak baris `\n` dan tanda petik ganda `"` yang rentan rusak jika ditempel mentah di file `.env`. Base64 mengubahnya menjadi 1 baris teks aman.
3. **Fleksibel**: Seluruh kode helper di panduan aplikasi telah diperbarui untuk mendukung ketiga cara:
   * Membaca dari Base64 string (`ZITADEL_KEY_BASE64`) $\leftarrow$ **Rekomendasi Utama**
   * Membaca dari Raw JSON text (`ZITADEL_KEY_JSON`)
   * Membaca dari File Path (`ZITADEL_KEY_FILE`)

---

## 3. Status Data Migrasi

* **Total User Berhasil Dimigrasikan**: **14.410 / 14.410 User (100% Selesai)**
* **Sinkronisasi DB**: Kolom `users.zitadel_id` pada seluruh 14.410 baris user aktif di PostgreSQL Produksi telah terisi lengkap.
* **Role Dexter**: Seluruh 14.410 user telah diberikan role `staff` di Project Dexter ZITADEL.
* **File Mapping**: [`migration-mapping.csv`](file:///c:/AIGN/sso-client-management/migration-mapping.csv) (14.410 relasi `id, phone, zitadel_id`).

---

## 4. Panduan Teknis Per Aplikasi (.md)

| Aplikasi | Tech Stack | Cakupan Aksi | File Panduan |
| :--- | :--- | :--- | :--- |
| **1. Dashboard HR** | **Golang** | Create, Edit (Nama/No HP/Email), Delete/Deactivate | [INTEGRATION_DASHBOARD_HR_GOLANG.md](file:///C:/Users/ADMIN%20IAT/.gemini/antigravity/brain/c81e410e-0aab-41fb-bb2a-05215579ae86/INTEGRATION_DASHBOARD_HR_GOLANG.md) |
| **2. Mobile App** | **Golang** | Ganti PIN (Change PIN) | [INTEGRATION_MOBILE_APP_GOLANG.md](file:///C:/Users/ADMIN%20IAT/.gemini/antigravity/brain/c81e410e-0aab-41fb-bb2a-05215579ae86/INTEGRATION_MOBILE_APP_GOLANG.md) |
| **3. Dashboard Internal Team** | **Filament Laravel** | Create, Edit (Profil/No HP/Email/PIN), Delete via Model Observer | [INTEGRATION_FILAMENT_LARAVEL.md](file:///C:/Users/ADMIN%20IAT/.gemini/antigravity/brain/c81e410e-0aab-41fb-bb2a-05215579ae86/INTEGRATION_FILAMENT_LARAVEL.md) |
