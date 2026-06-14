package main

import (
	"log"
	"net/http"
	"os"

	"inventory-thingy/internal/handlers"
	"inventory-thingy/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	s := store.New()
	h := handlers.New(s)

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// Static files
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Routes
	r.Get("/", h.Dashboard)

	r.Route("/items", func(r chi.Router) {
		r.Get("/", h.ItemsList)
		r.Get("/list", h.ItemsList) // HTMX partial for filter results
		r.Get("/new", h.ItemNew)
		r.Post("/", h.ItemCreate)

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/edit", h.ItemEdit)
			r.Put("/", h.ItemUpdate)
			r.Delete("/", h.ItemDelete)
		})
	})

	log.Printf("🚀 inventory-thingy listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
