package qr_test

import (
	"testing"

	"inventory-thingy/internal/qr"
)

func TestParseScanned(t *testing.T) {
	base := "http://localhost:8080"

	tests := []struct {
		raw  string
		want string
	}{
		{"INV-ABC123", "INV-ABC123"},
		{"inventory-thingy:INV-ABC123", "INV-ABC123"},
		{base + "/items/scan-lookup?qr_code=INV-ABC123", "INV-ABC123"},
		{base + "/items/scan-lookup?qr_code=INV%2F123", "INV/123"},
		{"  INV-TRIM  ", "INV-TRIM"},
	}

	for _, tc := range tests {
		if got := qr.ParseScanned(tc.raw, base); got != tc.want {
			t.Fatalf("ParseScanned(%q) = %q, want %q", tc.raw, got, tc.want)
		}
	}
}

func TestPNG(t *testing.T) {
	png, err := qr.PNG("inventory-thingy:INV-TEST")
	if err != nil {
		t.Fatal(err)
	}
	if len(png) < 100 {
		t.Fatalf("expected png bytes, got %d", len(png))
	}
	if png[0] != 0x89 || png[1] != 'P' {
		t.Fatal("expected png header")
	}
}

func TestNewCode(t *testing.T) {
	code, err := qr.NewCode()
	if err != nil {
		t.Fatal(err)
	}
	if len(code) < 8 {
		t.Fatalf("unexpected code length: %q", code)
	}
}
