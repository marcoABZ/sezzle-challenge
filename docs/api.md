# Calculator API

Version 1. Base path is `/api/v1`. Requests and responses are JSON.

This is the only place where the contract is defined. `backend/SPEC.md`
and `frontend/SPEC.md` build on top of it and must never say something
different.

We treat the API as a standalone service. We don't assume the calculator
frontend is the only caller, and we don't assume callers are on the same
origin. That is why everything about calculating lives here, including
the order of operations: the caller sends an expression and gets a
result back.

## POST /api/v1/calculations

Evaluates one expression.

Request:

```http
POST /api/v1/calculations
Content-Type: application/json

{ "expression": "2 + 3 * 4" }
```

`expression` is required and must be a string. The body must be a single
JSON object, with no other fields and nothing after it.

Response (200):

```json
{ "result": 14 }
```

`result` is always a finite JSON number (see [Numbers](#numbers)).

## Expressions

### What we accept

- Numbers: digits with an optional decimal point (`12`, `12.5`, `5.`,
  `.5`), optionally followed by an exponent (`1e3`, `2.5E-3`, `1e+21`).
  Nothing else counts as a number: no `Inf`, no `NaN`, no hexadecimal,
  no digit separators, no decimal commas.
- Binary operators: `+`, `-`, `*`, `/` and `^` (power).
- Minus sign: `-` before a value negates it. There is no unary plus.
- Percent: `%` after a value divides it by 100.
- Square root: `sqrt(` expression `)`, lowercase.
- Parentheses: `(` expression `)`, nested as deep as the length limit
  allows.
- Spaces and tabs between any of those. We ignore them.

An expression can have at most 1,000 characters.

### Order of operations

From what binds tightest to what binds loosest:

1. Parentheses and `sqrt(...)`.
2. `%`.
3. `^`, grouping right to left (`2 ^ 3 ^ 2` is `2 ^ 9`).
4. The minus sign.
5. `*` and `/`, left to right.
6. `+` and `-`, left to right.

What this means in practice:

- `2 + 3 * 4` is `14` and `(2 + 3) * 4` is `20`.
- `-2 ^ 2` is `-4`, because the power binds tighter than the sign.
  `(-2) ^ 2` is `4`.
- The exponent can have its own sign: `2 ^ -1` is `0.5`.
- `%` is always percent, never remainder. `200 * 15%` is `30` and
  `200 + 10%` is `200.1`. `5 % 3` is an error.
- We never imply a multiplication. `2(3)` and `2 sqrt(4)` are errors.
- `0 ^ 0` is `1`.

### How we evaluate

- We parse the whole expression before calculating anything, so a syntax
  error always wins over an arithmetic one: `1 / 0 +` is
  `invalid_expression`.
- Operands are evaluated left to right and we report the first
  arithmetic error: `1 / 0 + sqrt(-1)` is `division_by_zero`.
- We check every intermediate result. An overflow or an undefined value
  anywhere fails the whole expression, even if a later step would hide
  it: `1 / (1e308 * 10)` is `result_out_of_range`, not `0`.

## Errors

All errors look like this:

```json
{ "error": { "code": "division_by_zero", "message": "cannot divide by zero" } }
```

`code` is stable, programs can rely on it. `message` is for people and
can change.

400 means the request doesn't have the shape we expect. 422 means the
shape is fine but we can't evaluate the expression.

- 400 `invalid_request`: the body is not valid JSON, is not an object,
  has an unknown field, has data after the object, is larger than 1 MiB,
  or `expression` is missing or not a string.
- 404 `not_found`: any path we don't define.
- 405 `method_not_allowed`: a path we define, called with the wrong
  method. The response has an `Allow` header.
- 415 `unsupported_media_type`: the request `Content-Type` is missing or
  is not `application/json`.
- 422 `invalid_expression`: the expression is empty or blank, has more
  than 1,000 characters, or doesn't follow the syntax above (an unknown
  character or name, a malformed number, a number too large to
  represent, a missing operand or operator, unbalanced or empty
  parentheses).
- 422 `division_by_zero`: a division by zero, or zero raised to a
  negative power.
- 422 `negative_square_root`: the square root of a negative value.
- 422 `undefined_result`: a step whose result is not a real number, for
  example `(-8) ^ 0.5`.
- 422 `result_out_of_range`: a step whose result is too large to
  represent.
- 500 `internal_error`: something unexpected. We don't return internal
  details.

Checks run in this order and we report the first one that fails:
path and method -> content type -> request shape -> expression syntax
-> evaluation.

## GET /api/v1/health

Returns `200` with `{ "status": "ok" }`. The container health check uses it.

## Numbers

We round the final result to 15 significant digits.

Why: decimal fractions like 0.1 have no exact binary representation, so
without rounding the result carries noise in the last digits
(`0.1 + 0.2` would be `0.30000000000000004`). A 64-bit float reliably
holds 15 significant decimal digits, so rounding there removes the noise
and nothing else. We do it in the service and not in each client, so
every caller gets the same answer. Only the final result is rounded,
intermediate steps keep full precision.

What this implies:

- A result with more than 15 significant digits loses the rest:
  `1234567890123456 + 1` returns `1234567890123460`.
- A result too small to represent returns `0`. Underflow is not an error.
- Negative zero is returned as `0`.
- A result within rounding distance of the largest representable number
  is reported as `result_out_of_range`.

## Transport

- Content type: a request with a body must send
  `Content-Type: application/json` (parameters like `charset` are fine).
  Every response, errors included, is `application/json`.
- Cross-origin calls: any origin can call the API. It is public, takes
  no credentials and keeps no state, so there is nothing an origin
  restriction would protect. Every response has
  `Access-Control-Allow-Origin: *`, and an `OPTIONS` preflight gets a
  `204` with the allowed methods and headers.

## Examples

```bash
URL=localhost:8080/api/v1/calculations
JSON='Content-Type: application/json'

curl -s -X POST $URL -H "$JSON" -d '{"expression":"2 + 3 * 4"}'
# 200 {"result":14}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"0.1 + 0.2"}'
# 200 {"result":0.3}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"sqrt(16) + 200 * 15%"}'
# 200 {"result":34}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"1 / 0"}'
# 422 {"error":{"code":"division_by_zero","message":"cannot divide by zero"}}

curl -s -X POST $URL -H "$JSON" -d '{"expression":"2 +"}'
# 422 {"error":{"code":"invalid_expression","message":"..."}}

curl -s -X POST $URL -d '{"expression":"1 + 1"}'
# 415 {"error":{"code":"unsupported_media_type","message":"..."}}
```