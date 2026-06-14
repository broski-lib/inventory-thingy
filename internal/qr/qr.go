package qr

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"strings"

	qrcode "github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

const payloadPrefix = "inventory-thingy:"

// Payload returns the URL encoded inside generated QR tags.
func Payload(baseURL, code string) string {
	baseURL = strings.TrimRight(baseURL, "/")
	return fmt.Sprintf("%s/items/scan-lookup?qr_code=%s", baseURL, url.QueryEscape(code))
}

// NewCode generates a unique asset tag identifier.
func NewCode() (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "INV-" + strings.ToUpper(hex.EncodeToString(buf)), nil
}

// PNG renders a QR code image for the given content.
func PNG(content string) ([]byte, error) {
	qrc, err := qrcode.NewWith(content, qrcode.WithErrorCorrectionLevel(qrcode.ErrorCorrectionMedium))
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := standard.NewWithWriter(nopCloser{&buf},
		standard.WithBuiltinImageEncoder(standard.PNG_FORMAT),
		standard.WithQRWidth(6),
		standard.WithBorderWidth(2),
	)

	if err := qrc.Save(w); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

type nopCloser struct {
	io.Writer
}

func (nopCloser) Close() error { return nil }

// ParseScanned normalizes camera output into a stored qr_code value.
func ParseScanned(raw, baseURL string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	if strings.HasPrefix(raw, payloadPrefix) {
		return strings.TrimSpace(strings.TrimPrefix(raw, payloadPrefix))
	}

	if parsed, err := url.Parse(raw); err == nil && parsed.Scheme != "" {
		if code := parsed.Query().Get("qr_code"); code != "" {
			return strings.TrimSpace(code)
		}
	}

	if idx := strings.LastIndex(raw, "qr_code="); idx >= 0 {
		fragment := raw[idx+len("qr_code="):]
		if amp := strings.Index(fragment, "&"); amp >= 0 {
			fragment = fragment[:amp]
		}
		if decoded, err := url.QueryUnescape(fragment); err == nil {
			return strings.TrimSpace(decoded)
		}
		return strings.TrimSpace(fragment)
	}

	return raw
}
