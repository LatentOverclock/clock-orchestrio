package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"clock-orchestrio/backend/internal/app"
	"clock-orchestrio/backend/internal/store"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://clock:clock@localhost:5432/clock?sslmode=disable"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	s, err := store.NewPostgresStore(ctx, databaseURL)
	if err != nil {
		log.Fatalf("store init failed: %v", err)
	}
	defer s.Close()

	a, err := app.New(s)
	if err != nil {
		log.Fatalf("app init failed: %v", err)
	}

	log.Printf("backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, a.Router()); err != nil {
		log.Fatal(err)
	}
}
