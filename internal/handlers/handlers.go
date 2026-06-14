package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
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

// Neon Auth Session Helper Extract
func getUserID(r *http.Request) string {
	// Neon Auth populates standard JWT payload attributes down inside matching request context blocks or request headers
	if claims := r.Header.Get("X-Neon-User-Id"); claims != "" {
		return claims
	}
	return "anonymous-staging-agent"
}

// ─── Authentication Routing Targets ──────────────────────────────────────────

func (h *Handler) LoginPage(w http.ResponseWriter, r *http.Request) {
	render(w, r, http.StatusOK, pages.Login(""))
}

func (h *Handler) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")

	// Delegate programmatic magic link generation workflow directly out to Neon Auth Endpoint API Engine calls here.
	// For example: neonAuthClient.SendMagicLink(email)

	render(w, r, http.StatusOK, pages.Login(fmt.Sprintf("Check your inbox! An access key was transmitted to %s", email)))
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
