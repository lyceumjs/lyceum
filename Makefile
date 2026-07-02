# Lyceum local dev — thin wrappers around docker compose.
# See docker-compose.yml (dev-parity Postgres; not a prod setup).

COMPOSE ?= docker compose

.PHONY: up down build

up: ## Light start: bring containers up from cached images (no rebuild)
	$(COMPOSE) up -d

down: ## Remove containers and the default network
	$(COMPOSE) down

build: ## Rebuild images from scratch and recreate containers
	$(COMPOSE) up -d --build --force-recreate
