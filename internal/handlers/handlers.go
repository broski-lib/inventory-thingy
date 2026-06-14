package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"inventory-thingy/internal/models"
	"inventory-thingy/templates/components"
	"inventory-thingy/templates/pages"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	db *sql.DB // Swapped mock store layout targets directly to Neon Postgres DB connection pool strings
}

func New(db *sql.DB) *Handler {
	return &Handler{db: db}
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

	query := "SELECT id, qr_code, name, description, condition, location, status, taken_out_at, image_url FROM items"
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
	qrCode := strings.TrimSpace(r.URL.Query().Get("qr_code"))

	var item models.Item
	err := h.db.QueryRow("SELECT id, qr_code, name, description, condition, location, status, taken_out_at, image_url FROM items WHERE qr_code = $1", qrCode).
		Scan(&item.ID, &item.QRCode, &item.Name, &item.Description, &item.Condition, &item.Location, &item.Status, &item.TakenOutAt, &item.ImageURL)

	if err == sql.ErrNoRows {
		// QR code isn't cataloged yet; pre-populate form with scanned barcode sequence
		newItem := models.Item{QRCode: qrCode, Status: "In Storage"}
		render(w, r, http.StatusOK, components.ItemFormModal(newItem, false))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Found asset; jump directly into contextual update views
	render(w, r, http.StatusOK, components.ItemFormModal(item, true))
}

func (h *Handler) ItemNew(w http.ResponseWriter, r *http.Request) {
	render(w, r, http.StatusOK, components.ItemFormModal(models.Item{Status: "In Storage"}, false))
}

func (h *Handler) ItemEdit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var item models.Item
	err := h.db.QueryRow("SELECT id, qr_code, name, description, condition, location, status, taken_out_at, image_url FROM items WHERE id = $1", id).
		Scan(&item.ID, &item.QRCode, &item.Name, &item.Description, &item.Condition, &item.Location, &item.Status, &item.TakenOutAt, &item.ImageURL)
	if err != nil {
		http.Error(w, "Asset Not Found", http.StatusNotFound)
		return
	}
	render(w, r, http.StatusOK, components.ItemFormModal(item, true))
}

func (h *Handler) ItemCreate(w http.ResponseWriter, r *http.Request) {
	uid := getUserID(r)
	now := time.Now()

	// Automatically handle the staging clock based on chosen tracking status
	var takenOutAt *time.Time
	if r.FormValue("status") == "Staged" {
		takenOutAt = &now
	}

	_, err := h.db.Exec(`
		INSERT INTO items (id, qr_code, name, description, condition, location, status, taken_out_at, image_url, created_by, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, '', $8, $9, $9)`,
		r.FormValue("qr_code"), r.FormValue("name"), r.FormValue("description"),
		r.FormValue("condition"), r.FormValue("location"), r.FormValue("status"),
		takenOutAt, uid, now,
	)
	if err != nil {
		http.Error(w, "Database allocation failure", http.StatusInternalServerError)
		return
	}

	w.Header().Set("HX-Location", "/items")
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) ItemUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now()

	var takenOutAt *time.Time
	if r.FormValue("status") == "Staged" {
		takenOutAt = &now
	}

	_, err := h.db.Exec(`
		UPDATE items SET qr_code=$1, name=$2, description=$3, condition=$4, location=$5, status=$6, taken_out_at=$7, updated_at=$8
		WHERE id=$9`,
		r.FormValue("qr_code"), r.FormValue("name"), r.FormValue("description"),
		r.FormValue("condition"), r.FormValue("location"), r.FormValue("status"),
		takenOutAt, now, id,
	)
	if err != nil {
		http.Error(w, "Database modification error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("HX-Location", "/items")
	w.WriteHeader(http.StatusOK)
}
