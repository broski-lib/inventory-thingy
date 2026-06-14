.PHONY: dev build generate tidy clean

# Install templ if not present, generate, then run with live reload
dev: generate
	go run ./cmd/server

# Generate templ → Go files
generate:
	templ generate

# Full build
build: generate
	go build -o bin/inventory-thingy ./cmd/server

# Watch mode (requires air: go install github.com/air-verse/air@latest)
watch:
	air

# Tidy dependencies
tidy:
	go mod tidy

# Clean build artifacts
clean:
	rm -rf bin/
	find . -name "*_templ.go" -delete
