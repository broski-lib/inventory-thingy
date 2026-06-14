package models

import (
	"time"

	"github.com/google/uuid"
)

type Category string

const (
	CategoryElectronics Category = "Electronics"
	CategoryClothing    Category = "Clothing"
	CategoryFood        Category = "Food"
	CategoryTools       Category = "Tools"
	CategoryOther       Category = "Other"
)

var Categories = []Category{
	CategoryElectronics,
	CategoryClothing,
	CategoryFood,
	CategoryTools,
	CategoryOther,
}

type Item struct {
	ID          string
	Name        string
	Description string
	Category    Category
	Quantity    int
	Price       float64
	SKU         string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func NewItem(name, description string, category Category, quantity int, price float64, sku string) Item {
	now := time.Now()
	return Item{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Category:    category,
		Quantity:    quantity,
		Price:       price,
		SKU:         sku,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func (i Item) StockStatus() string {
	switch {
	case i.Quantity == 0:
		return "out-of-stock"
	case i.Quantity <= 5:
		return "low-stock"
	default:
		return "in-stock"
	}
}

func (i Item) StockBadgeClass() string {
	switch i.StockStatus() {
	case "out-of-stock":
		return "badge-error"
	case "low-stock":
		return "badge-warning"
	default:
		return "badge-success"
	}
}

func (i Item) StockLabel() string {
	switch i.StockStatus() {
	case "out-of-stock":
		return "Out of Stock"
	case "low-stock":
		return "Low Stock"
	default:
		return "In Stock"
	}
}
