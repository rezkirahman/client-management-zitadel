# Panduan Integrasi ZITADEL SSO: Mobile App (Golang Backend)

Dokumen ini berisi panduan teknis bagi tim backend Golang pada **Mobile App** untuk menyinkronkan fitur **Ganti PIN** langsung ke **ZITADEL SSO Server** menggunakan **Service Account Key berbentuk Text di `.env` (Base64)** tanpa file fisik di server.

---

## 1. Kredensial & Konfigurasi Lingkungan (`.env`)

Tambahkan variabel berikut ke file `.env` backend Golang Mobile:

```env
# ZITADEL Identity Provider (Production)
ZITADEL_ISSUER="https://sso.agforce.co.id"
ZITADEL_CLIENT_ID="390958723364902048"

# Service Account Key (Base64 Text di .env - Tidak perlu simpan file fisik)
ZITADEL_KEY_BASE64="eyJ0eXBlIjoic2VydmljZWFjY291bnQiLCJrZXlJZCI6IjM5MTI1MjE1NTY5ODMxMjk2NiIsImtleSI6Ii0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUVvd0lCQUFLQ0FRRUF4WFkzaE04MWd5K2ROeE51MDhQb1lBSk5ySFlnNlJXRnRUNUFQUEZnWUxIc1lQZ3NcblN3dm1hQVNaaXJDeU4zcDZqZFRMNmhIRTdaMDRUQTI2anREWDVrZlhhTVBtdHkwUjF4MjhDR2xJWE45ZkNuWWdcbjIrYUNUR3Vqbm9YRW05TmptQkd1UGhwOTFER3doSy8xT2ZBb0xUSmo2WE16aHFVSTkrQ0c5Z3B6blNYZXphMUFcbnR2b3BIVVdJQmpkakdFV25uZ216cmVoODdGTUUwcDkyZ0lzODkwaXJWcGQwNzN2cXVraXdIWkZwbGdzSWZ2TStcbk1xUGxQQVhodzVFSGZmdHBuTWxoL21MRmJaeENMclpRblI4K0pFSmZlRkhYVlp3SGVmaDNHb0RIQkZsS3B6M2lcbnpRU1FLUmJPNWhId1NqTzRTR3dDV2NXd21UK1hwWWNzL3FuV013SURBUUFCQW9JQkFGZ3ZGMVJFaFkxMHNpMXFcbmpGQWVhYVNXNHNGbWNBUW9ESEtJdm45NC9LV3lUL0p1WXJtUk12QzVQU2puQ0hBbVRwMFFyNUIxSnhGRzZXRnRcbnNDY2Z0WXV1QWRGVHk3RjZlMEVxa2xMZlVlWElDOVhNTTVpQk5TZVQycHBzK3dUc1Bzb20rejNZN3VEWTRCQWhcbjFNNXZKa0lwQXQyN0NRUFVxRkNyQVJyWVNCR2hreDdhWklDMksvLzVOTm9lazY2QWFsS3pHYXdzdUVRL3BVZHNcbi9kQnVnTi9VVlAzejllaUxFSThabmFheWRkNloyVXUxZW16RWM3Z3c3RkJCZWIwaEJWRTI1akNhamZ1Wk5JSExcbi9QQzUxelBvTEFJeUVIL0lNRk05aWZ4SUhreVNjdE1ZazF3eDU2UWkvRVRDQVRYalliK0V4eEZpYmZzL0x1VGZcbnNITDZWR0VDZ1lFQTV2ZlgxQWxLdUlwNC9rQkRsbGVKeWxtOHBjdkVSWWJQcnk3Qnp4bnIrcnFOMWlTLzZGTnBcbm9MZjB1OXNRYnJoUVl6WjF0OU9WMVdBTERjbi9QKzBhS2ErbHVoZkMxTjlITklHUlhsanNKTmRSV3VueW1wMC9cbmx2NkVGTWNxSGhiOWZUbXhTTkxvYmhVZGRZdWV4bEpyNnNPVnB3bndqMGhMQURqRWhvNmVzblVDZ1lFQTJ0eS9cbmRWUDlmVk11bVgwQ2FKeFB2MHBwU1JaMkRCTDZ1MXNBeFNDY1BRbnJDYWU5YWtoeHAzRERUNjJaSGJRenM1MDlcblZ3eVpzTjBwNm9mOFp3eUk2OHhJMmk1N1NSL1F1MHBvR1BTdlRha3NOM0VJNXBEanhLcCs4SDh4bnZ3ZDJJRmJcbmJGamc3Nyt6eXBMVVBGWkdkWUJOU2pnaUcyeDY0MCtwM2lZT2dRY0NnWUJwVHMyWVB0aFR4Y2NlM2J3ek94eDNcbkoyMHRCdmdwWHlzb1M2QlFSaGhqREZZSk1sNVJsbDZOeWZJTENQbTRFYytOUE5KMWkwSkF0SGExeGNqY284V1BcbkJpZ0E3ajZHQW51YnhBdTh3YnlCbTY3YlRkbXdoMHZzRTRXelY0K3JnbjMzYjZ1V2NadEtQZFJkdU5nZXdvdXpcbjBaTlZRdUhzNG1CWDdJb21jN2FGMVFLQmdCUFJGUXpjbEFFNi9PY3M2SURzVmxRdHVxYkJmK0xML1NQbHM0WWxcbjA3KzdIQ3I5b3lyeWNFZ0c3OGhSSWFJTTVQbUliVHRxaXFmMi9vcWIwWURMSThLbDlwcTZ4ckx5VElZSTBMQWhcbng1V3lrYXhiY2NEZXNhRG5CeU5qZ095eVMwbUZQTy9zaEVGeERDaDFidjRmbWJXZDdtR2YvNGFZSmZCYkVEaHJcbkhia1ZBb0dCQUxCREpNUGtKTGpDWHdMb1A4eXBHbjNuQ2RjNHVoUmd4RGxHeWlncmQ1MjdiSEt5bStzZjd2SFdcbnlQVk9BT0REZTZ4cW9jZ3pHcFRrKzFZaUpYUjY2d1NwZzJEWlIxWjJGdUZqVWdXbVlRYmJndVNLNzQwRVZtQ0pcbklZOUdhNFdHeHJ2eXo5Q2psS1hraVJtQWUzazkvem0rZXFVWnAwa0pIRWw0UllIRkx3OFNcbi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tXG4iLCJleHBpcmF0aW9uRGF0ZSI6Ijk5OTktMTItMzFUMjM6NTk6NTlaIiwidXNlcklkIjoiMzkxMjUyMDUzMjM5ODEzMjgwIn0="
```

---

## 2. Implementasi Helper PIN di Golang

### File: `pkg/zitadel/pin.go`

```go
package zitadel

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type PINConfig struct {
	Issuer    string
	KeyBase64 string // Ambil dari ZITADEL_KEY_BASE64 di .env
	KeyJSON   string // Alternatif jika raw JSON string
	KeyFile   string // Alternatif jika path file fisik
}

type keyDataJSON struct {
	KeyID  string `json:"keyId"`
	Key    string `json:"key"`
	UserID string `json:"userId"`
}

type PINClient struct {
	issuer     string
	keyData    *keyDataJSON
	rsaKey     *rsa.PrivateKey
	httpClient *http.Client

	mu          sync.RWMutex
	accessToken string
	tokenExpiry time.Time
}

func loadKeyBytes(cfg PINConfig) ([]byte, error) {
	if cfg.KeyBase64 != "" {
		return base64.StdEncoding.DecodeString(strings.TrimSpace(cfg.KeyBase64))
	}
	if cfg.KeyJSON != "" {
		return []byte(strings.TrimSpace(cfg.KeyJSON)), nil
	}
	if cfg.KeyFile != "" {
		return os.ReadFile(cfg.KeyFile)
	}
	return nil, fmt.Errorf("kredensial ZITADEL belum diisi (atur ZITADEL_KEY_BASE64 di .env)")
}

func NewPINClient(cfg PINConfig) (*PINClient, error) {
	rawBytes, err := loadKeyBytes(cfg)
	if err != nil {
		return nil, err
	}

	var kd keyDataJSON
	if err := json.Unmarshal(rawBytes, &kd); err != nil {
		return nil, fmt.Errorf("gagal parse JSON key: %w", err)
	}

	block, _ := pem.Decode([]byte(kd.Key))
	if block == nil {
		return nil, fmt.Errorf("format PEM key tidak valid")
	}

	privKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		parsedKey, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("gagal parse RSA private key: %w", err)
		}
		var ok bool
		privKey, ok = parsedKey.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("kunci bukan RSA private key")
		}
	}

	return &PINClient{
		issuer:     strings.TrimRight(cfg.Issuer, "/"),
		keyData:    &kd,
		rsaKey:     privKey,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}, nil
}

func (c *PINClient) getAccessToken(ctx context.Context) (string, error) {
	c.mu.RLock()
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry.Add(-5*time.Minute)) {
		token := c.accessToken
		c.mu.RUnlock()
		return token, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" && time.Now().Before(c.tokenExpiry.Add(-5*time.Minute)) {
		return c.accessToken, nil
	}

	now := time.Now().Unix()
	headerJSON, _ := json.Marshal(map[string]string{
		"alg": "RS256",
		"kid": c.keyData.KeyID,
		"typ": "JWT",
	})
	claimsJSON, _ := json.Marshal(map[string]interface{}{
		"iss": c.keyData.UserID,
		"sub": c.keyData.UserID,
		"aud": c.issuer,
		"iat": now,
		"exp": now + 3600,
	})

	unsignedToken := base64.RawURLEncoding.EncodeToString(headerJSON) + "." + base64.RawURLEncoding.EncodeToString(claimsJSON)
	hashed := sha256.Sum256([]byte(unsignedToken))
	sig, err := rsa.SignPKCS1v15(rand.Reader, c.rsaKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", fmt.Errorf("gagal sign JWT: %w", err)
	}
	assertion := unsignedToken + "." + base64.RawURLEncoding.EncodeToString(sig)

	formData := url.Values{}
	formData.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	formData.Set("assertion", assertion)
	formData.Set("scope", "openid profile email urn:zitadel:iam:org:project:id:zitadel:aud")

	req, err := http.NewRequestWithContext(ctx, "POST", c.issuer+"/oauth/v2/token", strings.NewReader(formData.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gagal menghubungi auth token ZITADEL: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token error (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &res); err != nil {
		return "", err
	}

	c.accessToken = res.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(res.ExpiresIn) * time.Second)
	return c.accessToken, nil
}

// ChangeUserPIN mengupdate PIN user langsung di ZITADEL
func (c *PINClient) ChangeUserPIN(ctx context.Context, zitadelID, newPlainPIN string) error {
	if zitadelID == "" {
		return fmt.Errorf("zitadel_id kosong")
	}
	if len(newPlainPIN) < 6 {
		return fmt.Errorf("PIN minimal 6 digit")
	}

	token, err := c.getAccessToken(ctx)
	if err != nil {
		return err
	}

	payload := map[string]interface{}{
		"password":       newPlainPIN,
		"changeRequired": false,
	}
	body, _ := json.Marshal(payload)

	url := fmt.Sprintf("%s/v2/users/human/%s/password", c.issuer, zitadelID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("gagal update PIN ke ZITADEL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("zitadel error (HTTP %d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}
```

---

## 3. Contoh Inisialisasi di Backend Mobile

```go
// Inisialisasi sekali saat server mobile start
pinClient, err := zitadel.NewPINClient(zitadel.PINConfig{
    Issuer:    os.Getenv("ZITADEL_ISSUER"),
    KeyBase64: os.Getenv("ZITADEL_KEY_BASE64"), // Membaca dari .env langsung
})
if err != nil {
    log.Fatalf("Zitadel PIN Client error: %v", err)
}
```
