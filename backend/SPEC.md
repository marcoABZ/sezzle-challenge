# Backend spec

Implements [`docs/api.md`](../docs/api.md). Go, standard library only.

The contract says what the service does. Here we cover what the contract
leaves open: how the code is split, the names the tests are written
against, and the rule behind each behaviour of the contract. The test
cases come from these two documents and live in `TEST_CASES.md`.

## Packages

`internal/calculator` is pure domain logic. It takes an expression and
returns a number or a domain error. The syntax, the order of operations,
the arithmetic rules and the result policy all live here. It must not
import `net/http`, `encoding/json` or `internal/httpapi` (the linter
enforces it).

`internal/httpapi` owns everything about HTTP: routing, CORS, the
content-type check, decoding, mapping domain errors to a status and
`code`, and encoding. No arithmetic here, and it knows nothing about
expression syntax.

`cmd/server` is only wiring. It reads `PORT` (default `8080`), builds
the handler, serves with read and write timeouts and shuts down
gracefully on SIGINT and SIGTERM. Nothing in it should need a unit test.

## calculator

### Public API

The tests are written against these names before any implementation
exists, so they are fixed.

```go
func Evaluate(expression string) (float64, error)

var (
	ErrInvalidExpression  = errors.New("invalid expression")
	ErrDivisionByZero     = errors.New("cannot divide by zero")
	ErrNegativeSquareRoot = errors.New("cannot take the square root of a negative number")
	ErrUndefinedResult    = errors.New("result is not a real number")
	ErrResultOutOfRange   = errors.New("result is out of range")
)
```

Callers match errors with `errors.Is`. `ErrInvalidExpression` can be
wrapped to say what was wrong (for example an unexpected `)`).

### Grammar

```
expression = term { ("+" | "-") term }
term       = unary { ("*" | "/") unary }
unary      = "-" unary | power
power      = postfix [ "^" unary ]
postfix    = primary { "%" }
primary    = number | "(" expression ")" | "sqrt" "(" expression ")"
number     = ( digits [ "." [ digits ] ] | "." digits ) [ exponent ]
exponent   = ( "e" | "E" ) [ "+" | "-" ] digits
```

### Rules

1. Three stages: tokenise, then parse, then evaluate. Parsing finishes
   before evaluation starts, so a syntax error always wins over an
   arithmetic one.
2. Length: an expression with more than 1,000 characters is
   `ErrInvalidExpression`, and we check this before anything else. It
   also limits how deep parentheses can nest, so the parser doesn't
   need its own depth limit.
3. Empty input: an empty or blank expression is `ErrInvalidExpression`.
4. Numbers: the tokeniser decides what a number is, following the
   grammar above. It must not leave that to `strconv.ParseFloat`, which
   also accepts `Inf`, `NaN` and hexadecimal. A literal too large to
   represent is `ErrInvalidExpression`.
5. Names: `sqrt` is the only name and it is lowercase. Any other run of
   letters is `ErrInvalidExpression`.
6. Whitespace: spaces and tabs between tokens are ignored. Any other
   character outside the grammar is `ErrInvalidExpression`.
7. Leftover input: anything left after a complete expression is
   `ErrInvalidExpression`. This is what rejects `2 3`, `2(3)` and `2)`.
8. Division: a zero divisor is `ErrDivisionByZero`, zero divided by zero
   included.
9. Power: zero to the zero is one. Zero raised to a negative exponent is
   `ErrDivisionByZero`.
10. Square root: of a negative value it is `ErrNegativeSquareRoot`.
11. Percent: divides its operand by 100.
12. Order of evaluation: we evaluate the operands of an operator left to
    right and then apply the operator. The first error stops the
    evaluation.
13. Every step is checked: after each operation, NaN is
    `ErrUndefinedResult` and positive or negative infinity is
    `ErrResultOutOfRange`.
14. Final result policy: applied once, to the value of the whole
    expression, in this order:
    1. Round to 15 significant digits.
    2. If the rounding produced positive or negative infinity, it is
       `ErrResultOutOfRange`.
    3. Negative zero becomes zero.

## httpapi

### Public API

```go
func NewHandler() http.Handler
```

### Rules

1. Order of checks: path and method -> content type -> request shape ->
   the calculator. We report the first one that fails.
2. Routing: a path we don't define is `404 not_found`. A path we define,
   called with the wrong method, is `405 method_not_allowed`, and its
   `Allow` header includes the method that path accepts.
3. CORS: every response, every error included, has
   `Access-Control-Allow-Origin: *`. An `OPTIONS` request to any path
   gets a `204` with no body, `Access-Control-Allow-Methods` and
   `Access-Control-Allow-Headers: Content-Type`.
4. Content type: a `POST` must send `application/json`. We compare the
   media type case-insensitively and ignore parameters like `charset`.
   A missing or different type is `415 unsupported_media_type`.
5. Strict decoding: Go's decoder silently accepts three things the
   contract rejects, so each one needs an explicit check:
   - a missing or `null` `expression` (it decodes to the empty string);
   - data after the JSON object;
   - unknown fields.
6. Body size: a body over 1 MiB is `400 invalid_request`.
7. Shape vs value: a request that is not a JSON object with a string
   `expression` is `400 invalid_request`. Once the shape is right, the
   string goes to the calculator untouched, and anything wrong with it
   is a `422`. An empty string has the right shape, so it is
   `422 invalid_expression`.
8. Domain errors are mapped to a status and `code` in exactly one place,
   using `errors.Is`.
9. Messages: for an error coming from the calculator, `message` is the
   text of the domain error. Any other `message` describes the problem
   without echoing the request body.
10. Unknown failures become `500 internal_error`. We log the cause and
    never return it.
11. Response type: every response with a body has
    `Content-Type: application/json`.

## Coverage

Measured on `internal/` only, with a 90% minimum enforced in CI.
`cmd/server` is wiring, so it is left out.

## Not in scope

Authentication, persistence or history, rate limiting, variables,
constants, and functions other than `sqrt`.