.PHONY: lint test cover

lint:
	cd backend && golangci-lint run ./...
	cd frontend && npm run lint && npm run typecheck

test:
	cd backend && go test ./...
	cd frontend && npm test

cover:
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
	cd frontend && npm run coverage