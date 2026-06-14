package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"inventory-thingy/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func RequireNeonAuthSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authCookie, err := r.Cookie("neon_auth_session")
		if err != nil || authCookie.Value == "" {
			if r.Header.Get("X-Neon-User-Id") == "" {
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

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

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Neon Connection Initialization Failure:", err)
	}
	defer db.Close()

	h := handlers.New(db)
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/login", h.LoginPage)
	r.Post("/auth/magic-link", h.RequestMagicLink)

	r.Group(func(protected chi.Router) {
		protected.Use(RequireNeonAuthSession)

		protected.Get("/", h.Dashboard)
		protected.Get("/scanner", h.OpenScanner)

		protected.Route("/items", func(itemsRouter chi.Router) {
			// ... [Keep item routes exactly identical] ...
		})
	})

	log.Printf("🚀 Staging application online listening smoothly at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
