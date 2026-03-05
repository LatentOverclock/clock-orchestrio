DC=docker compose

.PHONY: up down build logs test test-backend test-frontend

up:
	$(DC) up -d --build

down:
	$(DC) down -v

build:
	$(DC) build

logs:
	$(DC) logs -f

test: test-backend test-frontend

test-backend:
	docker run --rm -v "$(CURDIR)/backend:/app" -w /app golang:1.22 sh -c '/usr/local/go/bin/go test ./...'

test-frontend:
	cd frontend && npm test
