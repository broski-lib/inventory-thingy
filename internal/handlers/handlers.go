package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"inventory-thingy/internal/models"
	"inventory-thingy/internal/store"
	"inventory-thingy/templates/components"
	"inventory-thingy/templates/pages"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store *store.Store
}

func New(s *store.Store) *Handler {
	return &Handler{store: s}
}

// isHTMX returns true when the request came from HTMX.
func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true"
}

// render is a helper that writes a templ component to the response.
func render(w http.ResponseWriter, r *http.Request, status int, t templ.Component) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	if err := t.Render(r.Context(), w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	total, lowStock, outOfStock, totalValue := h.store.Stats()
	render(w, r, http.StatusOK, pages.Dashboard(pages.DashboardData{
		Total:      total,
		LowStock:   lowStock,
		OutOfStock: outOfStock,
		TotalValue: totalValue,
	}))
}

// ─── Items list ───────────────────────────────────────────────────────────────

func (h *Handler) ItemsList(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	category := r.URL.Query().Get("category")

	f := store.Filter{
		Search:   search,
		Category: models.Category(category),
	}
	items := h.store.List(f)

	if isHTMX(r) && r.URL.Path == "/items/list" {
		// Partial: just the table body for filter requests
		render(w, r, http.StatusOK, pages.ItemsTable(items))
		return
	}

	render(w, r, http.StatusOK, pages.Items(items, search, category))
}

// ─── Item form (new) ──────────────────────────────────────────────────────────

func (h *Handler) ItemNew(w http.ResponseWriter, r *http.Request) {
	render(w, r, http.StatusOK, components.ItemFormModal(models.Item{}, false, nil))
}

// ─── Item form (edit) ─────────────────────────────────────────────────────────

func (h *Handler) ItemEdit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := h.store.Get(id)
	if err != nil {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	render(w, r, http.StatusOK, components.ItemFormModal(item, true, nil))
}

// ─── Create item ──────────────────────────────────────────────────────────────

func (h *Handler) ItemCreate(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	item, errs := parseItemForm(r)
	if len(errs) > 0 {
		// Return 422 so hx-target-error fires
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnprocessableEntity)
		components.FormError("Please fix the errors below").Render(r.Context(), w)
		return
	}

	if err := h.store.Create(item); err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnprocessableEntity)
		components.FormError(fmt.Sprintf("Could not save item: %s", err)).Render(r.Context(), w)
		return
	}

	// Return just the new row (appended to table body)
	w.Header().Set("HX-Trigger", `{"showToast": "Item added successfully!"}`)
	render(w, r, http.StatusCreated, pages.ItemRow(item))
}

// ─── Update item ──────────────────────────────────────────────────────────────

func (h *Handler) ItemUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	existing, err := h.store.Get(id)
	if err != nil {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	updated, errs := parseItemForm(r)
	if len(errs) > 0 {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnprocessableEntity)
		components.FormError("Please fix the errors below").Render(r.Context(), w)
		return
	}

	updated.ID = existing.ID
	updated.CreatedAt = existing.CreatedAt

	if err := h.store.Update(updated); err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnprocessableEntity)
		components.FormError(fmt.Sprintf("Could not update item: %s", err)).Render(r.Context(), w)
		return
	}

	// Swap out the row in-place
	w.Header().Set("HX-Trigger", `{"showToast": "Item updated!"}`)
	w.Header().Set("HX-Retarget", "#item-"+id)
	w.Header().Set("HX-Reswap", "outerHTML")
	render(w, r, http.StatusOK, pages.ItemRow(updated))
}

// ─── Delete item ──────────────────────────────────────────────────────────────

func (h *Handler) ItemDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.store.Delete(id); err != nil {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	w.Header().Set("HX-Trigger", `{"showToast": "Item deleted"}`)
	w.WriteHeader(http.StatusOK)
	// Empty body → HTMX swaps outerHTML of the row with nothing
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func parseItemForm(r *http.Request) (models.Item, map[string]string) {
	errs := make(map[string]string)

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		errs["name"] = "Name is required"
	}

	sku := strings.TrimSpace(r.FormValue("sku"))
	if sku == "" {
		errs["sku"] = "SKU is required"
	}

	category := models.Category(r.FormValue("category"))
	if category == "" {
		errs["category"] = "Category is required"
	}

	quantity, err := strconv.Atoi(r.FormValue("quantity"))
	if err != nil || quantity < 0 {
		errs["quantity"] = "Quantity must be a non-negative number"
	}

	price, err := strconv.ParseFloat(r.FormValue("price"), 64)
	if err != nil || price < 0 {
		errs["price"] = "Price must be a non-negative number"
	}

	description := strings.TrimSpace(r.FormValue("description"))

	if len(errs) > 0 {
		return models.Item{}, errs
	}

	return models.NewItem(name, description, category, quantity, price, sku), errs
}
