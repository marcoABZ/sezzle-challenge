# Calculator

A full-stack calculator built for the Sezzle technical challenge: a Go API
that evaluates expressions and a React keypad that edits them.

## Run it

The app is deployed on a DigitalOcean Droplet and available at
[sezzle.codebymarco.dev](https://sezzle.codebymarco.dev/). Its DNS
records are managed on Cloudflare.

To run it locally, Docker is the only requirement.

```bash
make up        # builds the image and runs it on port 8080
```

Then open http://localhost:8080. The API is on the same address, under
`/api/v1`. Stop it with Ctrl+C.

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
`frontend/coverage/index.html`. CI runs lint, tests and coverage on every
push to `main` and on pull requests, and uploads both reports as
artifacts.

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
- `PRODUCT.md` and `DESIGN.md`: the product brief and the visual design
  the UI was built from.
- `PROMPTS.md`: the prompts behind every test and implementation session.
- `CLAUDE.md` (root and each side): the standing rules for the agents.

## Design decisions

### Behave like a phone calculator

The goal was a calculator that works like the one already on your phone.
The keypad builds an expression, precedence and parentheses work the way
you expect, errors are short texts, and you can keep calculating from a
result. When a behaviour was in doubt, I went with what a phone
calculator does.

### One endpoint that takes a whole expression

My first idea was one endpoint per operation, but I soon moved to a single
endpoint for simplicity. At first it received an operation and its
operands. That design fell apart on precedence: a calculator app has to
evaluate `2 + 3 × 4` as 14, so with operation-and-operands calls the
client would have to work out precedence itself and make the calls in the
right order. That puts the real logic in the client and leaves the API
"dumb".

So the endpoint takes the whole expression: `POST /api/v1/calculations`
with `{"expression": "2 + 3 * 4"}`. The trade-off is a more complex API.
It needs a grammar, a tokenizer, a parser and a precise set of error
codes, all defined in [docs/api.md](docs/api.md). In return, the frontend
stays simple: it edits text, sends it on equals and does no arithmetic.
Any other consumer can also start using the API without reimplementing
precedence, and every caller gets the same answer from the same place.

### Components only render

On the frontend I kept the components free of logic and network calls.
The work is split into layers:

- The API client (`src/api/client.ts`) is the only place that calls
  `fetch`.
- A pure reducer (`src/hooks/calculatorState.ts`) holds all the
  behaviour. Key presses and API answers go in, and the next state comes
  out.
- A custom hook (`src/hooks/useCalculator.ts`) holds the state and sends
  the request the state asks for.
- The components render the state and forward key presses. The linter
  stops them from importing the API client.

For an app this small, the layers might look like overengineering. I
think they pay for themselves in maintainability, because each piece has
one reason to change and can be tested on its own.

### Test behaviour, not tiny components

I prefer to test functionality on larger units instead of writing a unit
test for every small component. In my experience, tests on tiny frontend
components are brittle and expensive to maintain: they break on markup
changes that no user would notice. Well-written high-level tests reach
good coverage without that cost. In this project:

- The reducer is tested as sequences of key presses, with nothing
  rendered.
- The client and the hook are tested against a fake `fetch` and a fake
  client.
- The components are tested only through `<App />`. Keys are found by
  role and accessible name, as a user or a screen reader would find them.
  There are no snapshots and no test ids.

## How I used AI

See [PROMPTS.md](PROMPTS.md).
