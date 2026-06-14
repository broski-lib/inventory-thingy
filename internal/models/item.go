package models

import (
	"time"
)

type Condition string

const (
	ConditionExcellent Condition = "Excellent"
	ConditionGood      Condition = "Good"
	ConditionWorn      Condition = "Worn"
	ConditionDamaged   Condition = "Damaged"
)

type Item struct {
	ID          string     `db:"id"`
	QRCode      string     `db:"qr_code"` // Target lookup value from barcode scans
	Name        string     `db:"name"`
	Description string     `db:"description"`
	Condition   Condition  `db:"condition"`
	Location    string     `db:"location"`     // e.g., "Warehouse A", "123 Maple St Staging"
	Status      string     `db:"status"`       // e.g., "Staged", "In Storage", "In Transit"
	TakenOutAt  *time.Time `db:"taken_out_at"` // Track timestamps for staging deployment
	ImageURL    string     `db:"image_url"`    // Future proofing asset path
	CreatedBy   string     `db:"created_by"`   // Bound to Neon Auth User ID
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"`
}

func (i Item) StatusBadgeClass() string {
	switch i.Status {
	case "Staged":
		return "badge-primary"
	case "In Storage":
		return "badge-success"
	case "In Transit":
		return "badge-warning"
	default:
		return "badge-neutral"
	}
}
