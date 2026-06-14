package store

import (
	"errors"
	"strings"
	"sync"
	"time"

	"inventory-thingy/internal/models"
)

var (
	ErrNotFound  = errors.New("item not found")
	ErrDuplicate = errors.New("item with this SKU already exists")
)

type Filter struct {
	Search   string
	Category models.Category
}

type Store struct {
	mu    sync.RWMutex
	items map[string]models.Item
}

func New() *Store {
	s := &Store{
		items: make(map[string]models.Item),
	}
	s.seed()
	return s
}

func (s *Store) seed() {
	seeds := []models.Item{
		models.NewItem("MacBook Pro 14\"", "Apple M3 Pro chip, 18GB RAM", models.CategoryElectronics, 12, 1999.99, "ELEC-MBP14"),
		models.NewItem("USB-C Hub 7-in-1", "Multiport adapter with HDMI, USB-A, SD card", models.CategoryElectronics, 3, 49.99, "ELEC-USBHUB"),
		models.NewItem("Mechanical Keyboard", "TKL layout, Cherry MX Brown switches", models.CategoryElectronics, 0, 129.99, "ELEC-MCKBD"),
		models.NewItem("Work Boots (Size 10)", "Steel-toe, waterproof leather", models.CategoryClothing, 8, 89.99, "CLTH-BOOT10"),
		models.NewItem("High-Vis Vest L", "ANSI Class 2, lime green", models.CategoryClothing, 25, 14.99, "CLTH-HIVL"),
		models.NewItem("Cordless Drill", "18V, 2-speed, includes 2 batteries", models.CategoryTools, 5, 74.99, "TOOL-DRILL"),
		models.NewItem("Tape Measure 25ft", "Magnetic tip, belt clip", models.CategoryTools, 18, 12.99, "TOOL-TAPE25"),
		models.NewItem("Safety Glasses", "ANSI Z87.1, anti-fog coating", models.CategoryTools, 2, 8.99, "TOOL-SAFEG"),
		models.NewItem("Instant Ramen Pack (x24)", "Variety flavors, 85g each", models.CategoryFood, 40, 18.99, "FOOD-RAMEN24"),
		models.NewItem("Coffee Beans 1kg", "Single origin Ethiopian, medium roast", models.CategoryFood, 7, 22.50, "FOOD-COFF1K"),
	}
	for _, item := range seeds {
		s.items[item.ID] = item
	}
}

func (s *Store) List(f Filter) []models.Item {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []models.Item
	for _, item := range s.items {
		if f.Category != "" && item.Category != f.Category {
			continue
		}
		if f.Search != "" {
			q := strings.ToLower(f.Search)
			if !strings.Contains(strings.ToLower(item.Name), q) &&
				!strings.Contains(strings.ToLower(item.SKU), q) &&
				!strings.Contains(strings.ToLower(item.Description), q) {
				continue
			}
		}
		result = append(result, item)
	}
	return result
}

func (s *Store) Get(id string) (models.Item, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.items[id]
	if !ok {
		return models.Item{}, ErrNotFound
	}
	return item, nil
}

func (s *Store) Create(item models.Item) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, existing := range s.items {
		if existing.SKU == item.SKU {
			return ErrDuplicate
		}
	}
	s.items[item.ID] = item
	return nil
}

func (s *Store) Update(item models.Item) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[item.ID]; !ok {
		return ErrNotFound
	}
	item.UpdatedAt = time.Now()
	s.items[item.ID] = item
	return nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return ErrNotFound
	}
	delete(s.items, id)
	return nil
}

func (s *Store) Stats() (total, lowStock, outOfStock int, totalValue float64) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, item := range s.items {
		total++
		totalValue += float64(item.Quantity) * item.Price
		switch item.StockStatus() {
		case "low-stock":
			lowStock++
		case "out-of-stock":
			outOfStock++
		}
	}
	return
}
