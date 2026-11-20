BACKEND_MIN_COVERAGE := 90
IMAGE := calculator

.PHONY: lint lint-backend lint-frontend test test-backend test-frontend cover cover-backend cover-frontend up

lint: lint-backend lint-frontend
test: test-backend test-frontend
cover: cover-backend cover-frontend

lint-backend:
	cd backend && golangci-lint run ./...

lint-frontend:
	cd frontend && npm run lint && npm run typecheck

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm test

# Coverage is measured on internal/ only: cmd/server is wiring.
cover-backend:
	cd backend && go test -coverprofile=coverage.out ./internal/...
	cd backend && go tool cover -func=coverage.out
	cd backend && go tool cover -html=coverage.out -o coverage.html
	cd backend && ./scripts/check-coverage.sh coverage.out $(BACKEND_MIN_COVERAGE)

cover-frontend:
	cd frontend && npm run coverage

# Builds one image and serves the app and the API on http://localhost:8080.
up:
	docker build -t $(IMAGE) .
	docker run --rm -p 8080:8080 $(IMAGE)
