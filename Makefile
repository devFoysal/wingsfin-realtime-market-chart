.PHONY: up down logs migrate seed test lint build clean

up:
	docker compose up -d --build --wait --remove-orphans

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose run --rm backend npm run migrate

seed:
	docker compose run --rm backend npm run seed

test:
	npm test --workspaces --if-present

lint:
	npm run lint --workspaces --if-present

build:
	npm run build

clean:
	docker compose down -v --remove-orphans
