package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"inventory-thingy/internal/models"
	"inventory-thingy/internal/qr"
	"inventory-thingy/templates/components"
	"inventory-thingy/templates/pages"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	db      *sql.DB
	baseURL string
}

func New(db *sql.DB, baseURL string) *Handler {
	return &Handler{
		db:      db,
		baseURL: strings.TrimRight(baseURL, "/"),
	}
}

func render(w http.ResponseWriter, r *http.Request, status int, t templ.Component) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_ = t.Render(r.Context(), w)
}

type contextKey string

const userContextKey contextKey = "user"

type UserContext struct {
	ID    string
	Email string
	Name  string
}

// Neon Auth Session Helper Extract
func getUserID(r *http.Request) string {
	if val := r.Context().Value(userContextKey); val != nil {
		if u, ok := val.(UserContext); ok {
			return u.Email
		}
	}
	if claims := r.Header.Get("X-Neon-User-Id"); claims != "" {
		return claims
	}
	return "anonymous-staging-agent"
}

// clearCookies removes all known auth cookies from the browser
func clearCookies(w http.ResponseWriter) {
	cookiesToClear := []string{"better-auth.session_token", "__Secure-neonauth.session_token", "neonauth.session_token"}
	for _, name := range cookiesToClear {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})
	}
}

// AuthMiddleware protects routes and validates session cookies directly from the database
func (h *Handler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var token string
		if c, err := r.Cookie("better-auth.session_token"); err == nil {
			token = c.Value
		} else if c, err := r.Cookie("__Secure-neonauth.session_token"); err == nil {
			token = c.Value
		} else if c, err := r.Cookie("neonauth.session_token"); err == nil {
			token = c.Value
		}

		if token == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		var user UserContext
		var expiresAt time.Time
		query := `
			SELECT u.id::text, u.email, COALESCE(u.name, ''), s."expiresAt"
			FROM neon_auth.session s
			JOIN neon_auth.user u ON s."userId" = u.id
			WHERE s.token = $1`
		err := h.db.QueryRow(query, token).Scan(&user.ID, &user.Email, &user.Name, &expiresAt)
		if err != nil {
			if err == sql.ErrNoRows {
				// Clear invalid cookies
				clearCookies(w)
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}
			log.Printf("Auth DB query error: %v", err)
			http.Error(w, "Authentication check failed", http.StatusInternalServerError)
			return
		}

		if time.Now().After(expiresAt) {
			// Clear expired cookies
			clearCookies(w)
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// Store user in context
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ─── Authentication Routing Targets ──────────────────────────────────────────

func (h *Handler) LoginPage(w http.ResponseWriter, r *http.Request) {
	render(w, r, http.StatusOK, pages.Login(""))
}

func (h *Handler) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	email := strings.TrimSpace(r.FormValue("email"))
	if email == "" {
		render(w, r, http.StatusBadRequest, pages.Login("Email address is required"))
		return
	}

	neonAuthURL := os.Getenv("NEON_AUTH_URL")
	if neonAuthURL == "" {
		http.Error(w, "Neon Auth URL configuration missing", http.StatusInternalServerError)
		return
	}

	payload, err := json.Marshal(map[string]string{
		"email": email,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("POST", neonAuthURL+"/sign-in/magic-link", bytes.NewBuffer(payload))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	// Set Origin to our app's base URL so Neon Auth constructs the redirect and verification link appropriately
	req.Header.Set("Origin", h.baseURL)

	// Propagate standard proxy headers so Better Auth constructs dynamic URLs relative to our Go backend
	// appURL, err := url.Parse(h.baseURL)
	// if err == nil {
	// 	req.Header.Set("X-Forwarded-Host", appURL.Host)
	// 	req.Header.Set("X-Forwarded-Proto", appURL.Scheme)
	// }

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Failed to request magic link from Neon Auth: %v", err)
		render(w, r, http.StatusInternalServerError, pages.Login("Failed to request login link. Please try again."))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("Neon Auth returned error status %d: %s", resp.StatusCode, string(respBody))
		render(w, r, http.StatusBadRequest, pages.Login("Error requesting magic link. Please check your email address."))
		return
	}

	render(w, r, http.StatusOK, pages.Login(fmt.Sprintf("Check your inbox! An access key was transmitted to %s", email)))
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// 1. Get the session token from the cookies
	var token string
	if c, err := r.Cookie("better-auth.session_token"); err == nil {
		token = c.Value
	} else if c, err := r.Cookie("__Secure-neonauth.session_token"); err == nil {
		token = c.Value
	} else if c, err := r.Cookie("neonauth.session_token"); err == nil {
		token = c.Value
	}

	// 2. Clear all local cookies
	clearCookies(w)

	// 3. Call remote sign-out in backend if token exists
	if token != "" {
		neonAuthURL := os.Getenv("NEON_AUTH_URL")
		if neonAuthURL != "" {
			req, err := http.NewRequest("POST", neonAuthURL+"/sign-out", nil)
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Cookie", "__Secure-neonauth.session_token="+token)
				req.Header.Set("Content-Type", "application/json")
				// Fire and forget
				go func() {
					resp, err := http.DefaultClient.Do(req)
					if err == nil {
						resp.Body.Close()
					}
				}()
			}
		}
	}

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// AuthProxy handles proxying authentication requests to the Neon Auth endpoint
func (h *Handler) AuthProxy(w http.ResponseWriter, r *http.Request) {
	neonAuthURL := os.Getenv("NEON_AUTH_URL")
	target, err := url.Parse(neonAuthURL)
	if err != nil {
		http.Error(w, "Invalid Neon Auth URL configuration", http.StatusInternalServerError)
		return
	}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = target.Scheme
			req.URL.Host = target.Host
			
			// Strip prefix "/auth" from the request path before joining
			path := req.URL.Path
			if strings.HasPrefix(path, "/auth") {
				path = path[5:]
			}
			req.URL.Path = singleJoiningSlash(target.Path, path)
			
			// Set Host to target host so SSL verification and routing work on Neon
			req.Host = target.Host

			// Set forwarding headers so Better Auth knows the actual client domain
			// appURL, err := url.Parse(h.baseURL)
			// if err == nil {
			// 	req.Header.Set("X-Forwarded-Host", appURL.Host)
			// 	req.Header.Set("X-Forwarded-Proto", appURL.Scheme)
			// }
		},
	}
	proxy.ServeHTTP(w, r)
}

func singleJoiningSlash(a, b string) string {
	aslash := strings.HasSuffix(a, "/")
	bslash := strings.HasPrefix(b, "/")
	switch {
	case aslash && bslash:
		return a + b[1:]
	case !aslash && !bslash:
		return a + "/" + b
	}
	return a + b
}

// ─── Core Operations Handlers ────────────────────────────────────────────────

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	var staged, storage, transit int
	_ = h.db.QueryRow("SELECT count(*) FROM items WHERE status = 'Staged'").Scan(&staged)
	_ = h.db.QueryRow("SELECT count(*) FROM items WHERE status = 'In Storage'").Scan(&storage)
	_ = h.db.QueryRow("SELECT count(*) FROM items WHERE status = 'In Transit'").Scan(&transit)

	render(w, r, http.StatusOK, pages.Dashboard(pages.DashboardData{
		TotalStaged:  staged,
		TotalStorage: storage,
		TotalTransit: transit,
	}))
}

func (h *Handler) ItemsList(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	query := `SELECT id, qr_code, name, description, "condition", location, status, taken_out_at, image_url FROM items`
	var args []any

	if search != "" {
		query += " WHERE name ILIKE $1 OR qr_code ILIKE $1 OR location ILIKE $1"
		args = append(args, "%"+search+"%")
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		var item models.Item
		_ = rows.Scan(&item.ID, &item.QRCode, &item.Name, &item.Description, &item.Condition, &item.Location, &item.Status, &item.TakenOutAt, &item.ImageURL)
		items = append(items, item)
	}

	if r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
		render(w, r, http.StatusOK, pages.ItemsCardList(items))
		return
	}
	render(w, r, http.StatusOK, pages.Items(items, search))
}

func (h *Handler) OpenScanner(w http.ResponseWriter, r *http.Request) {
	render(w, r, http.StatusOK, components.ScannerModal())
}

func (h *Handler) QRScanLookup(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("qr_code"))
	qrCode := qr.ParseScanned(raw, h.baseURL)
	if qrCode == "" {
		http.Error(w, "Missing QR tag data", http.StatusBadRequest)
		return
	}

	var item models.Item
	err := h.db.QueryRow(`SELECT id, qr_code, name, description, "condition", location, status, taken_out_at, image_url FROM items WHERE qr_code = $1`, qrCode).
		Scan(&item.ID, &item.QRCode, &item.Name, &item.Description, &item.Condition, &item.Location, &item.Status, &item.TakenOutAt, &item.ImageURL)

	if err == sql.ErrNoRows {
		newItem := models.Item{QRCode: qrCode, Status: "In Storage"}
		render(w, r, http.StatusOK, components.ItemFormModal(newItem, false))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	render(w, r, http.StatusOK, components.ItemFormModal(item, true))
}

func (h *Handler) ItemQRPNG(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var code string
	err := h.db.QueryRow(`SELECT qr_code FROM items WHERE id = $1`, id).Scan(&code)
	if err == sql.ErrNoRows {
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Lookup failed", http.StatusInternalServerError)
		return
	}

	png, err := qr.PNG(qr.Payload(h.baseURL, code))
	if err != nil {
		log.Printf("qr png generation failed: %v", err)
		http.Error(w, "Could not generate QR code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(png)
}

func (h *Handler) ItemQRModal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var item models.Item
	err := h.db.QueryRow(`SELECT id, qr_code, name FROM items WHERE id = $1`, id).
		Scan(&item.ID, &item.QRCode, &item.Name)
	if err == sql.ErrNoRows {
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Lookup failed", http.StatusInternalServerError)
		return
	}

	render(w, r, http.StatusOK, components.QRTagModal(item))
}

func (h *Handler) ItemQRPrint(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var item models.Item
	err := h.db.QueryRow(`SELECT id, qr_code FROM items WHERE id = $1`, id).
		Scan(&item.ID, &item.QRCode)
	if err == sql.ErrNoRows {
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Lookup failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head>
	<title>QR Tag</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 16px;
			font-family: monospace;
			font-size: 14px;
		}
		img { width: 200px; height: 200px; display: block; }
		p { margin: 8px 0 0 0; }
		@page { margin: 0; size: auto; }
	</style>
</head>
<body>
	<img src="/items/%s/qr.png" />
	<p>%s</p>
	<script>
		window.onload = function() {
			window.print();
			window.onafterprint = function() { window.close(); };
		};
	</script>
</body>
</html>`, item.ID, item.QRCode)
}

func (h *Handler) ItemNew(w http.ResponseWriter, r *http.Request) {
	code, err := qr.NewCode()
	if err != nil {
		http.Error(w, "Could not generate asset tag", http.StatusInternalServerError)
		return
	}
	render(w, r, http.StatusOK, components.ItemFormModal(models.Item{QRCode: code, Status: "In Storage"}, false))
}

func (h *Handler) ItemEdit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var item models.Item
	err := h.db.QueryRow(`SELECT id, qr_code, name, description, "condition", location, status, taken_out_at, image_url FROM items WHERE id = $1`, id).
		Scan(&item.ID, &item.QRCode, &item.Name, &item.Description, &item.Condition, &item.Location, &item.Status, &item.TakenOutAt, &item.ImageURL)
	if err != nil {
		http.Error(w, "Asset Not Found", http.StatusNotFound)
		return
	}
	render(w, r, http.StatusOK, components.ItemFormModal(item, true))
}

func (h *Handler) ItemCreate(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form submission", http.StatusBadRequest)
		return
	}

	uid := getUserID(r)
	now := time.Now()

	qrCode := strings.TrimSpace(r.FormValue("qr_code"))
	if qrCode == "" {
		var err error
		qrCode, err = qr.NewCode()
		if err != nil {
			http.Error(w, "Could not generate asset tag", http.StatusInternalServerError)
			return
		}
	}

	var takenOutAt *time.Time
	if r.FormValue("status") == "Staged" {
		takenOutAt = &now
	}

	_, err := h.db.Exec(`
		INSERT INTO items (qr_code, name, description, "condition", location, status, taken_out_at, image_url, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, '', $8, $9, $9)`,
		qrCode, r.FormValue("name"), r.FormValue("description"),
		r.FormValue("condition"), r.FormValue("location"), r.FormValue("status"),
		takenOutAt, uid, now,
	)
	if err != nil {
		log.Printf("item create failed: %v", err)
		http.Error(w, "Could not save item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("HX-Redirect", "/items")
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) ItemUpdate(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form submission", http.StatusBadRequest)
		return
	}

	id := chi.URLParam(r, "id")
	now := time.Now()

	var takenOutAt *time.Time
	if r.FormValue("status") == "Staged" {
		takenOutAt = &now
	}

	_, err := h.db.Exec(`
		UPDATE items SET qr_code=$1, name=$2, description=$3, "condition"=$4, location=$5, status=$6, taken_out_at=$7, updated_at=$8
		WHERE id=$9`,
		r.FormValue("qr_code"), r.FormValue("name"), r.FormValue("description"),
		r.FormValue("condition"), r.FormValue("location"), r.FormValue("status"),
		takenOutAt, now, id,
	)
	if err != nil {
		log.Printf("item update failed: %v", err)
		http.Error(w, "Could not update item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("HX-Redirect", "/items")
	w.WriteHeader(http.StatusOK)
}
