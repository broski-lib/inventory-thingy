package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"inventory-thingy/internal/db"
	"inventory-thingy/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("Missing DATABASE_URL variable setup configuration parameters.")
	}

	if os.Getenv("NEON_AUTH_URL") == "" {
		log.Fatal("Missing NEON_AUTH_URL or BASE_URL for magic link orchestration.")
	}

	db, err := db.Open(context.Background(), dsn)
	if err != nil {
		log.Fatal("Neon connection failed:", err)
	}
	defer db.Close()

	h := handlers.New(db, appBaseURL(port))
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/login", h.LoginPage)
	r.Post("/auth/magic-link", h.RequestMagicLink)

	r.Group(func(protected chi.Router) {

		protected.Get("/", h.Dashboard)
		protected.Get("/scanner", h.OpenScanner)

		protected.Route("/items", func(itemsRouter chi.Router) {
			itemsRouter.Get("/", h.ItemsList)
			itemsRouter.Get("/list", h.ItemsList)
			itemsRouter.Get("/scan-lookup", h.QRScanLookup)
			itemsRouter.Get("/new", h.ItemNew)
			itemsRouter.Post("/", h.ItemCreate)
			itemsRouter.Route("/{id}", func(idRouter chi.Router) {
				idRouter.Get("/edit", h.ItemEdit)
				idRouter.Get("/qr", h.ItemQRModal)
				idRouter.Get("/qr.png", h.ItemQRPNG)
				idRouter.Get("/qr/print", h.ItemQRPrint)
				idRouter.Put("/", h.ItemUpdate)
			})

		})

	})

	log.Printf("🚀 Staging application online listening smoothly at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func appBaseURL(port string) string {
	if base := os.Getenv("BASE_URL"); base != "" {
		return base
	}
	return "http://localhost:" + port
}
