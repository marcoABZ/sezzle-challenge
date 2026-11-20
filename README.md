# Calculator

A full-stack calculator: a Go API that evaluates expressions and a React
keypad that edits them.

## Run it

Docker is the only requirement.

```bash
make up        # same as: docker compose up --build
```

Then open http://localhost:8080. The API is on the same address, under
`/api/v1`. Stop it with `make down`.

## Run it without Docker

You need Go (the version in `backend/go.mod`), Node (the version in
`frontend/.nvmrc`), golangci-lint v2 and make.

```bash
# terminal 1: the API, on http://localhost:8080
cd backend && go run ./cmd/server

# terminal 2: the app, on http://localhost:5173
cd frontend && npm ci && npm run dev
```

The dev server proxies `/api` to the API, so the browser always talks to
a single origin.

## Tests, lint and coverage

```bash
make lint      # golangci-lint, oxlint and the TypeScript compiler
make test      # Go tests and Vitest
make cover     # both, with coverage, failing below 90%
```

Each one also exists per side, for example `make test-backend` and
`make cover-frontend`.

The coverage reports are written to `backend/coverage.html` and
`frontend/coverage/index.html`. CI runs the same three commands on every
push and uploads both reports as artifacts.

## API

The full contract is in [docs/api.md](docs/api.md). Some examples:

```bash
URL=localhost:8080/api/v1/calculations
JSON='Content-Type: application/json'

curl -s -X POST $URL -H "$JSON" -d '{"expression":"2 + 3 * 4"}'
# 200 {"result":14}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"sqrt(16) + 200 * 15%"}'
# 200 {"result":34}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"1 / 0"}'
# 422 {"error":{"code":"division_by_zero","message":"cannot divide by zero"}}
```

## Where things are

- `docs/api.md`: the contract.
- `backend/`: the Go API. `SPEC.md` has its rules and `TEST_CASES.md` the
  cases the tests come from.
- `frontend/`: the React app, with its own `SPEC.md` and `TEST_CASES.md`.
- `PROMPTS.md`: every prompt I used, what came back and what I changed.
- `CLAUDE.md` (root and each side): the standing rules for the agents.

## Design decisions

To be written.

## How I used AI

See [PROMPTS.md](PROMPTS.md).
