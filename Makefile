stop:
	docker compose down -v

start:
	docker compose up -d

build:
	docker build -t betterme-app .
