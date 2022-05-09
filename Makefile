up:
	docker compose up -d

down:
	docker compose down

db:
	docker compose exec db psql -U postgres -d staytune-dev
	# psql -U postgres -h localhost -p 5001 -d staytune-dev


