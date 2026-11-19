
# Backend

Go, standard library only. Read `SPEC.md` and `../docs/api.md` before
anything else.

## Layout

- `internal/calculator`: pure domain logic. No `net/http`, no
  `encoding/json`, no import of `internal/httpapi` (depguard fails the
  lint).
- `internal/httpapi`: everything HTTP. No arithmetic and no knowledge of
  the expression syntax.
- `cmd/server`: wiring only.

## Tests

- Table-driven, one row per case in `TEST_CASES.md`. The name of the row
  is the case itself (the expression or the request), so a failure
  points back to the file.
- Black-box: test files use `package calculator_test` and
  `package httpapi_test`, and go only through `Evaluate` and
  `NewHandler`.
- Compare errors with `errors.Is`, never by message text.
- Compare results with `==`. The spec rounds every result, so the
  expected values are exact.
- HTTP tests use `net/http/httptest`. No real network and no real port.
- HTTP tests assert the status, the `code` (or the `result`) and the
  headers the case names. They don't assert the `message` text.

## Code

- Errors are the sentinel errors from the spec, wrapped with `%w` when
  there is detail to add.
- Bad input never panics. A panic is a bug.
- No global mutable state.
- Exported names have doc comments.
- gofmt and goimports clean (the lint checks it).
