package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file loaded:", err)
	} else {
		fmt.Println(".env file loaded successfully")
	}

	fmt.Printf("PORT: %q\n", os.Getenv("PORT"))
	fmt.Printf("NEON_AUTH_URL: %q\n", os.Getenv("NEON_AUTH_URL"))
	fmt.Printf("DATABASE_URL: %q\n", os.Getenv("DATABASE_URL"))
}
