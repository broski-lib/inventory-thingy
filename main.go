package main

import (
	"fmt"
	"net/http"

	"github.com/a-h/templ"
)

func main() {
	index := hello("test")

	http.Handle("/", templ.Handler(index))

	fmt.Println("Listening on :3000")
	http.ListenAndServe(":3000", nil)
}
