# inventory-thingy

A lightweight inventory management app built with **Go**, **Templ**, **HTMX**, and **DaisyUI**.

## Stack

| Layer      | Tech                                               |
|------------|----------------------------------------------------|
| Server     | Go + [chi](https://github.com/go-chi/chi)          |
| Templates  | [Templ](https://templ.guide) (type-safe HTML)      |
| Interactivity | [HTMX](https://htmx.org) (no JS framework)     |
| UI         | [DaisyUI](https://daisyui.com) + Tailwind CSS      |
| Storage    | In-memory (swap out `internal/store` for a DB)     |

## Project layout

```
inventory-thingy/
├── cmd/server/          # main.go — entrypoint
├── internal/
│   ├── handlers/        # HTTP handlers
│   ├── models/          # domain types (Item, Category…)
│   └── store/           # in-memory store (replace with DB)
├── templates/
│   ├── components/      # reusable fragments (modal, toast…)
│   ├── layouts/         # base HTML shell
│   └── pages/           # full-page views
├── static/              # CSS / JS assets
├── .air.toml            # live-reload config (air)
└── Makefile
```

## Prerequisites

```bash
# Go 1.22+
go version

# Templ CLI
go install github.com/a-h/templ/cmd/templ@latest

# (optional) Air for live reload
go install github.com/air-verse/air@latest
```

## Getting started

```bash
# 1. Clone / enter directory
cd inventory-thingy

# 2. Install dependencies
go mod tidy

# 3. Generate Go code from .templ files
templ generate

# 4. Run
go run ./cmd/server
# → http://localhost:8080
```

## Development (live reload)

```bash
make watch   # requires air
# or
make dev     # generate + run (no watch)
```

## Build for production

```bash
make build
./bin/inventory-thingy
```

## Replacing the in-memory store

The `internal/store/store.go` file exposes a simple interface (`List`, `Get`, `Create`, `Update`, `Delete`, `Stats`). To swap in a real database:

1. Create `internal/store/postgres.go` (or sqlite, etc.)
2. Implement the same method signatures
3. Wire it up in `cmd/server/main.go`

Popular choices: **sqlc** + PostgreSQL, **GORM**, **Bun**, or **SQLite** via `modernc.org/sqlite`.

Redesign for a mobile focus, streamline interaction for mobile interaction. This is for staging furniture so redesign around the necessary details for that (like current location, time take out, name, picture of item, etc) where objects are scanned via qr code in order to find them in the database (but still include search). it isn't so much quantity as it is unique items. use neon db for items. for now don't implement handing for pictures just add placeholder. Use neon auth with magic links for handling user sessions.
