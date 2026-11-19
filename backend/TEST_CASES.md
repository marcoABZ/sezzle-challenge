# Backend test cases (design only)

Sources: `docs/api.md` and `backend/SPEC.md`. No tests exist yet; this file
is the list of cases an implementation must pass.

Conventions:
- Each case is one line: input, expected result, then the mistake it catches.
- `" + 1" × 249` means that text repeated 249 times. `\t` is a tab, `\n` a newline.
- Calculator expected results are either a number, compared by value, or an error
  name, matched with `errors.Is`.
- HTTP cases give method, path, the headers that matter, the body, the status, the
  error code or result, and any extra response header the rule requires.
  Unless a case says otherwise, every response with a body has
  `Content-Type: application/json` and `Access-Control-Allow-Origin: *`.
  JSON numbers are compared by value, not by text.
- Expected numbers were computed with a throwaway Go program outside the repo. It
  applied each operation in the order the specs require, then the final result
  policy. The program has been deleted.

---

# Part 1: Calculator, `Evaluate(expression)`

## 1.1 Stages and error precedence (rules 1, 12)

Rule 1: tokenise, then parse, then evaluate. A syntax error wins over an arithmetic error.
Rule 12: operands are evaluated left to right; the first error stops evaluation.

```text
"1 / 0 +"                         -> ErrInvalidExpression     # evaluates before parsing, reports ErrDivisionByZero
"1 / 0 * (2"                      -> ErrInvalidExpression     # unclosed parenthesis hidden by the division error
"sqrt(-1) / 0 +"                  -> ErrInvalidExpression     # syntax error hidden by ErrNegativeSquareRoot
"1 / 0 + sqrt(-1)"                -> ErrDivisionByZero        # right operand evaluated before left
"sqrt(-1) + 1 / 0"                -> ErrNegativeSquareRoot    # right operand evaluated before left
"(-8) ^ 0.5 * 1 / 0"              -> ErrUndefinedResult       # later error reported instead of the first
"1e308 * 10 + 1 / 0"              -> ErrResultOutOfRange      # later error reported instead of the first
```

## 1.2 Length limit (rule 2)

Rule 2: more than 1,000 characters is ErrInvalidExpression. The check runs before
anything else, and it also caps how deep parentheses can nest.

```text
"1" + " + 1" × 249 + "   " (1,000 chars)     -> 250                     # limit enforced as under 1,000
"1" + " + 1" × 250 (1,001 chars)             -> ErrInvalidExpression    # limit off by one
"1 / 0" + 996 spaces (1,001 chars)           -> ErrInvalidExpression    # length checked after evaluation (would give ErrDivisionByZero)
"(" × 499 + "1" + ")" × 499 + " " (1,000)   -> 1                       # parser's own nesting cap below 499
"(" × 500 + "1" + ")" × 500 (1,001 chars)     -> ErrInvalidExpression    # nesting depth not bounded by the length limit
```

## 1.3 Empty and blank input (rule 3)

Rule 3: an empty or blank expression is ErrInvalidExpression.

```text
""                                -> ErrInvalidExpression    # empty input evaluated as 0
" \t "                            -> ErrInvalidExpression    # blank input evaluated as 0
```

## 1.4 Whitespace and characters outside the grammar (rule 6)

Rule 6: only spaces and tabs are ignored between tokens. Any other character outside
the grammar is ErrInvalidExpression.

```text
"2\t+\t3"                         -> 5                       # tabs between tokens rejected
"  2 + 3  "                       -> 5                       # leading and trailing spaces rejected
"sqrt (16)"                       -> 4                       # space between the name and "(" rejected
"2 +\n3"                          -> ErrInvalidExpression    # newline treated as a space
"2 + 3" (no-break space)     -> ErrInvalidExpression    # Unicode space treated as whitespace
"2 − 3" (U+2212 minus)            -> ErrInvalidExpression    # Unicode minus accepted as minus
"2 × 3" (U+00D7)                  -> ErrInvalidExpression    # Unicode multiplication accepted
"2 ÷ 4" (U+00F7)                  -> ErrInvalidExpression    # Unicode division accepted
"2 $ 3"                           -> ErrInvalidExpression    # unknown character skipped
"2 ** 3"                          -> ErrInvalidExpression    # "**" accepted as power
```

## 1.5 Names (rule 5)

Rule 5: `sqrt` is the only name, lowercase. Any other run of letters is ErrInvalidExpression.

```text
"SQRT(16)"                        -> ErrInvalidExpression    # names matched case-insensitively
"sqrt 16"                         -> ErrInvalidExpression    # function accepted without parentheses
"sqrt16"                          -> ErrInvalidExpression    # letter run starting with sqrt read as sqrt(16)
"sqrtx(4)"                        -> ErrInvalidExpression    # longer letter run read as sqrt
"pi"                              -> ErrInvalidExpression    # constant accepted
"e"                               -> ErrInvalidExpression    # bare exponent letter accepted as a value
"abs(-2)"                         -> ErrInvalidExpression    # unknown function accepted
```

## 1.6 Numbers (rule 4; grammar `number` and `exponent`)

Rule 4: the tokeniser follows the grammar. A literal too large to represent is
ErrInvalidExpression.

Accepted forms:

```text
"12"                              -> 12                      # digits only
"12.5"                            -> 12.5                    # decimal point dropped
"5."                              -> 5                       # trailing point rejected
".5"                              -> 0.5                     # leading point rejected
"5.e3"                            -> 5000                    # exponent after a trailing point rejected
".5e2"                            -> 50                      # exponent after a leading point rejected
"1e3"                             -> 1000                    # exponent not parsed
"2.5E-3"                          -> 0.0025                  # uppercase E rejected
"1e+21"                           -> 1e21                    # explicit plus in the exponent rejected
"007"                             -> 7                       # leading zeros rejected (grammar allows any digits)
```

Rejected forms:

```text
"."                               -> ErrInvalidExpression    # lone point read as 0
"..5"                             -> ErrInvalidExpression    # double point accepted
"1.2.3"                           -> ErrInvalidExpression    # second point ignored
"e3"                              -> ErrInvalidExpression    # exponent without a mantissa accepted
"1e"                              -> ErrInvalidExpression    # exponent without digits read as 1
"1e+"                             -> ErrInvalidExpression    # exponent sign without digits accepted
"1e 3"                            -> ErrInvalidExpression    # space inside the exponent accepted
"0x1F"                            -> ErrInvalidExpression    # hexadecimal accepted (strconv.ParseFloat)
"0b101"                           -> ErrInvalidExpression    # binary literal accepted
"Inf"                             -> ErrInvalidExpression    # infinity accepted (strconv.ParseFloat)
"NaN"                             -> ErrInvalidExpression    # NaN accepted (strconv.ParseFloat)
"1_000"                           -> ErrInvalidExpression    # digit separator accepted
"1,5"                             -> ErrInvalidExpression    # decimal comma accepted
"1 000"                           -> ErrInvalidExpression    # space joins two digit runs
"+1"                              -> ErrInvalidExpression    # unary plus accepted
"２" (full-width two)             -> ErrInvalidExpression    # non-ASCII digit accepted (unicode.IsDigit)
"1e309"                           -> ErrInvalidExpression    # overflowing literal becomes +Inf and is accepted
"1e400 / 0"                       -> ErrInvalidExpression    # division by zero reported before the bad literal
```

## 1.7 Grammar: `expression` and `term` (the + - and * / chains)

Rule (grammar): `expression = term { ("+" | "-") term }`, `term = unary { ("*" | "/") unary }`.

```text
"2 + 3"                           -> 5                       # "+" missing
"2 - 3"                           -> -1                      # "-" missing or treated as "+"
"2 * 3"                           -> 6                       # "*" missing
"2 / 4"                           -> 0.5                     # "/" missing or treated as "*"
"2 +"                             -> ErrInvalidExpression    # missing right operand accepted (as 2)
"* 2"                             -> ErrInvalidExpression    # missing left operand accepted (as 2)
"2 + * 3"                         -> ErrInvalidExpression    # two binary operators in a row accepted
```

## 1.8 Grammar: `unary = "-" unary | power`

Rule (grammar): a minus sign before a value negates it. There is no unary plus.

```text
"-2"                              -> -2                      # leading minus dropped
"-(2 + 3)"                        -> -5                      # minus before a group dropped
"-sqrt(16)"                       -> -4                      # minus before sqrt rejected
"-"                               -> ErrInvalidExpression    # lone sign read as 0
```

## 1.9 Grammar: `power = postfix [ "^" unary ]`

Rule (grammar): power takes an optional exponent; the exponent is a unary.

```text
"2 ^ 3"                           -> 8                       # power not computed
"2 ^"                             -> ErrInvalidExpression    # missing exponent accepted (as 2)
"^ 2"                             -> ErrInvalidExpression    # missing base accepted (as 2)
"2 ^ +3"                          -> ErrInvalidExpression    # unary plus accepted in the exponent
```

## 1.10 Grammar: `postfix = primary { "%" }`, and percent (rule 11)

Rule 11: `%` after a value divides it by 100. `%` is never a remainder.

```text
"50%"                             -> 0.5                     # percent not divided by 100
"50%%"                            -> 0.005                   # repeated percent applied once
"50 %"                            -> 0.5                     # space before % rejected
"200 * 15%"                       -> 30                      # percent mis-applied (doc example)
"%"                               -> ErrInvalidExpression    # percent with no operand accepted
"5 % 3"                           -> ErrInvalidExpression    # % read as remainder
```

## 1.11 Grammar: `primary` and parentheses

Rule (grammar): `primary = number | "(" expression ")" | "sqrt" "(" expression ")"`.

```text
"((1 + 2) * (3 + 4))"             -> 21                      # nested groups mis-evaluated (inner parentheses ignored)
"((2))"                           -> 2                       # redundant parentheses rejected
"()"                              -> ErrInvalidExpression    # empty group read as 0
"(())"                            -> ErrInvalidExpression    # nested empty group accepted
"2 * ()"                          -> ErrInvalidExpression    # empty group accepted as an operand
"2 + 3)"                          -> ErrInvalidExpression    # unopened ")" ignored
"(2 + 3"                          -> ErrInvalidExpression    # unclosed "(" closed silently
"((2)"                            -> ErrInvalidExpression    # unclosed "(" inside a group accepted
```

## 1.12 Leftover input (rule 7)

Rule 7: anything left after a complete expression is ErrInvalidExpression.

```text
"2 3"                             -> ErrInvalidExpression    # second number ignored
"2(3)"                            -> ErrInvalidExpression    # implied multiplication
"(2)(3)"                          -> ErrInvalidExpression    # implied multiplication after a group
"2 sqrt(4)"                       -> ErrInvalidExpression    # implied multiplication before sqrt
```

## 1.13 Order of operations, neighbouring levels in both orders

Rule (api.md, Order of operations), tightest to loosest: parentheses and sqrt;
`%`; `^`; unary minus; `*` `/`; `+` `-`.

Parentheses/sqrt and `%`, `%` and `^`:

```text
"(2 + 3)%"                        -> 0.05                    # % applied to 3 only
"2 + 3%"                          -> 2.03                    # % applied to the sum (gives 0.05)
"50% ^ 2"                         -> 0.25                    # ^ applied before % (gives 25)
"2 ^ 50%"                         -> 1.4142135623731         # % applied after ^ (gives 11258999068426.2)
```

Percent with addition, both orders:

```text
"200 + 10%"                       -> 200.1                   # % applied to the sum (gives 2.1)
"10% + 200"                       -> 200.1                   # % applied to the sum (gives 2.1)
```

`^` and unary minus, and `^` with `*`, both orders:

```text
"-2 ^ 2"                          -> -4                      # sign applied before power (gives 4)
"3 * 2 ^ 2"                       -> 12                      # power applied to the product (gives 36)
"2 ^ 2 * 3"                       -> 12                      # power applied to the product (gives 64)
"2 * -3 ^ 2"                      -> -18                     # power applied after the sign (gives 18)
```

Unary minus and addition:

```text
"-2 + 3"                          -> 1                       # sign applied to the whole sum (gives -5)
```

`*` `/` and `+` `-`, both orders:

```text
"2 + 3 * 4"                       -> 14                      # left to right, ignoring precedence (gives 20)
"2 * 3 + 4"                       -> 10                      # addition binds tighter (gives 14)
"1 - 6 / 3"                       -> -1                      # subtraction binds tighter (gives -5/3)
"6 / 3 - 1"                       -> 1                       # subtraction binds tighter (gives 3)
```

Not cased, because no input can tell them apart: unary minus against `*` and `/`
(sign and multiplication commute); `%` against `*` (dividing by 100 commutes with
multiplication); `sqrt` against `^` (`sqrt(x)^n` equals `sqrt(x^n)`).

## 1.14 Associativity: three operands at each level that has it

Rule (api.md): `+ -`, `* /` and `^` are grouped as stated (`^` right to left).

```text
"10 - 4 - 3"                      -> 3                       # grouped right (gives 9)
"1 - 2 + 3"                       -> 2                       # grouped right (gives -4)
"12 / 3 / 2"                      -> 2                       # grouped right (gives 8)
"8 / 4 * 2"                       -> 4                       # grouped right (gives 1)
"2 ^ 3 ^ 2"                       -> 512                     # grouped left (gives 64)
"2 ^ 2 ^ -1"                      -> 1.4142135623731         # grouped left (gives 0.25)
```

## 1.15 Minus sign positions

Rule (grammar, api.md): the minus sign is allowed at the start, after an operator,
after an open parenthesis, in an exponent, and repeated. The plus sign is never a
unary operator.

```text
"2 * -3"                          -> -6                      # after "*" rejected
"2 - -3"                          -> 5                       # after binary "-" rejected
"(-3)"                            -> -3                      # after an open parenthesis rejected
"2 ^ -1"                          -> 0.5                     # sign in the exponent rejected
"1e-3"                            -> 0.001                   # sign in the number's exponent rejected
"--2"                             -> 2                       # repeated minus limited to one
"---2"                            -> -2                      # repeated minus, odd count
"2 -- 3"                          -> 5                       # repeated minus after binary "-"
"2 * - - 3"                       -> 6                       # repeated minus with spaces
"2 * -"                           -> ErrInvalidExpression    # sign with no operand after an operator
"+2"                              -> ErrInvalidExpression    # unary plus accepted at the start
"2 * +3"                          -> ErrInvalidExpression    # unary plus accepted after an operator
```

## 1.16 Division by zero (rule 8)

Rule 8: a zero divisor, including zero divided by zero, is ErrDivisionByZero.

```text
"1 / 0"                           -> ErrDivisionByZero       # no zero-divisor check (gives +Inf)
"1 / -0"                          -> ErrDivisionByZero       # zero checked by sign rather than value
"0 / 0"                           -> ErrDivisionByZero       # 0/0 produces NaN, reported as ErrUndefinedResult
"2 * (1 / 0)"                     -> ErrDivisionByZero       # error inside parentheses lost
"1 / (2 - 2)"                     -> ErrDivisionByZero       # check only for a literal zero, not a computed one
"1 / (1e-200 * 1e-200)"           -> ErrDivisionByZero       # open question Q11: the product underflows to 0 first
```

## 1.17 Power special cases (rule 9)

Rule 9: `0 ^ 0` is 1. Zero to a negative exponent is ErrDivisionByZero.

```text
"0 ^ 0"                           -> 1                       # 0^0 treated as NaN or an error
"0 ^ 0.5"                         -> 0                       # zero base with a positive fractional exponent rejected
"0 ^ -0"                          -> 1                       # -0 exponent treated as negative
"0 ^ -1"                          -> ErrDivisionByZero       # zero to a negative power returned as +Inf (out of range)
"2 + (0 ^ -1)"                    -> ErrDivisionByZero       # error inside parentheses lost
"0 ^ -0.5"                        -> ErrDivisionByZero       # only integer exponents checked
```

## 1.18 Square root (rule 10; grammar `sqrt`)

Rule 10: the square root of a negative value is ErrNegativeSquareRoot.

```text
"sqrt(16)"                        -> 4                       # sqrt not computed
"sqrt(sqrt(16))"                  -> 2                       # inner call rejected or unevaluated
"sqrt()"                          -> ErrInvalidExpression    # empty call accepted
"sqrt(16"                         -> ErrInvalidExpression    # unclosed call accepted
"sqrt(-1)"                        -> ErrNegativeSquareRoot   # no check, gives NaN
"2 * (sqrt(-1))"                  -> ErrNegativeSquareRoot   # error inside parentheses lost
"sqrt(1 - 2)"                     -> ErrNegativeSquareRoot   # check only for a literal operand
"sqrt(-0.0001)"                   -> ErrNegativeSquareRoot   # tolerance-based check treats a tiny negative as zero
"sqrt(-0)"                        -> 0                       # -0 treated as negative (open question Q14)
```

## 1.19 Undefined and out-of-range steps (rule 13)

Rule 13: after each operation, NaN is ErrUndefinedResult and ±Inf is ErrResultOutOfRange.

```text
"(-8) ^ 0.5"                      -> ErrUndefinedResult      # NaN from a negative base not checked
"2 + ((-8) ^ 0.5)"                -> ErrUndefinedResult      # error inside parentheses lost
"(-8) ^ 0.5 * 0"                  -> ErrUndefinedResult      # NaN hidden by a later multiplication by zero (gives 0)
"1e308 * 10"                      -> ErrResultOutOfRange     # +Inf not checked
"(1e308 * 10) / 2"                -> ErrResultOutOfRange     # error inside parentheses lost
"1e308 * 10 * 0"                  -> ErrResultOutOfRange     # +Inf hidden by a later multiplication by zero (gives 0)
"1 / (1e308 * 10)"                -> ErrResultOutOfRange     # +Inf used as divisor, result 0 (doc example)
"1e308 / 0.1"                     -> ErrResultOutOfRange     # overflow from division not checked
"-1e308 * 10"                     -> ErrResultOutOfRange     # -Inf checked only for +Inf
"10 ^ 309"                        -> ErrResultOutOfRange     # overflow from power not checked
```

## 1.20 Final result policy (rule 14)

Rule 14: round the whole result to 15 significant digits; if that is infinite,
it is ErrResultOutOfRange; negative zero becomes zero. Only the final value is
rounded.

Decimal noise:

```text
"0.1 + 0.2"                       -> 0.3                     # 0.30000000000000004 returned
"sqrt(2) ^ 2"                     -> 2                       # 2.0000000000000004 returned
"1 / 3"                           -> 0.333333333333333       # no rounding (0.3333333333333333 returned)
"1 / 3 * 3"                       -> 1                       # intermediate rounded to 15 digits (gives 0.999999999999999)
```

The 15-digit limit:

```text
"1234567890123456 + 1"            -> 1234567890123460        # result kept at 16 digits
"123456789012345678"              -> 123456789012346000      # 18-digit literal returned in full (123456789012345680)
"0.1234567890123456"              -> 0.123456789012346       # 16th digit truncated, not rounded
```

Negative zero:

```text
"-0"                              -> 0                       # -0 returned
"0 * -1"                          -> 0                       # -0 returned
"-0.0000000000000001"             -> -0.0000000000000001     # tiny negative result zeroed
```

Underflow (not an error):

```text
"1e-300 / 1e300"                  -> 0                       # underflow reported as ErrResultOutOfRange
"10 ^ -400"                       -> 0                       # power underflow reported as an error
```

Largest representable number:

```text
"1.79769313486231e308"            -> 1.79769313486231e308    # largest value returned rejected as out of range
"1.7976931348623157e308"          -> ErrResultOutOfRange     # largest float64 rounds to +Inf at 15 digits, so not returned
"1.79769313486232e308"            -> ErrInvalidExpression    # literal rounds past the maximum, so too large to represent
```

---

# Part 2: HTTP, handler returned by `NewHandler()`

## 2.1 Routing: undefined path is 404, wrong method on a defined path is 405 with `Allow` (rule 2)

Rule 2: a path not defined is 404 `not_found`. A defined path with the wrong method
is 405 `method_not_allowed`, with an `Allow` header that includes the method the path accepts.

```text
GET /api/v1/nope                                              -> 404 not_found                                  # undefined path answered 405 or 200
GET /api/v1                                                   -> 404 not_found                                  # prefix of a defined path matched
GET /api/v2/health                                            -> 404 not_found                                  # version not checked
GET /api/v1/Health                                            -> 404 not_found                                  # path matched case-insensitively
GET /api/v1/calculations                                      -> 405 method_not_allowed; Allow includes POST    # wrong method answered 404
POST /api/v1/health                                           -> 405 method_not_allowed; Allow includes GET     # health accepts any method
DELETE /api/v1/health                                         -> 405 method_not_allowed; Allow includes GET     # method checked only for POST
```

## 2.2 CORS and OPTIONS (rule 3)

Rule 3: every response, errors included, has `Access-Control-Allow-Origin: *`. An
OPTIONS request to any path gets `204` with no body, `Access-Control-Allow-Methods`
(which includes the path's methods) and `Access-Control-Allow-Headers: Content-Type`.

```text
OPTIONS /api/v1/calculations [Origin: https://example.com; Access-Control-Request-Method: POST; Access-Control-Request-Headers: Content-Type]
                                                              -> 204, no body; ACAO *; ACAM includes POST; ACAH is Content-Type     # preflight not answered, or methods missing
OPTIONS /api/v1/health [Origin: https://example.com; Access-Control-Request-Method: GET]
                                                              -> 204, no body; ACAO *; ACAM includes GET                             # health preflight not answered
OPTIONS /api/v1/nope                                          -> 204, no body; ACAO *                                              # undefined path answered 404 (SPEC reading; see D1)
POST /api/v1/calculations [Origin: https://example.com; Content-Type: application/json] {"expression":"1 / 0"}
                                                              -> 422 division_by_zero; ACAO *                                      # error responses lose the CORS header
```

## 2.3 Content type (rule 4)

Rule 4: a POST must send `application/json`. The media type is compared
case-insensitively and parameters such as `charset` are ignored. Anything else is
415 `unsupported_media_type`.

```text
POST /api/v1/calculations [Content-Type: Application/JSON; charset=UTF-8] {"expression":"1 + 1"}
                                                              -> 200 result 2                                                      # media type compared case-sensitively, or parameters rejected
POST /api/v1/calculations [Content-Type: text/plain] {"expression":"1 + 1"}
                                                              -> 415 unsupported_media_type                                        # body parsed regardless of its type
POST /api/v1/calculations [no Content-Type] {"expression":"1 + 1"}
                                                              -> 415 unsupported_media_type                                        # missing type treated as JSON
POST /api/v1/calculations [Content-Type: application/jsonx] {"expression":"1 + 1"}
                                                              -> 415 unsupported_media_type                                        # type matched by prefix
```

## 2.4 Strict decoding (rule 5)

Rule 5: a missing or `null` `expression`, data after the object, and unknown fields
are each 400 `invalid_request`. Each one is a case where Go's decoder is lenient by default.

```text
POST /api/v1/calculations [Content-Type: application/json] {}
                                                              -> 400 invalid_request                                               # missing expression decoded as "" (gives 422)
POST /api/v1/calculations [Content-Type: application/json] {"expression":null}
                                                              -> 400 invalid_request                                               # null decoded as ""
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 + 1","x":1}
                                                              -> 400 invalid_request                                               # unknown field ignored
POST /api/v1/calculations [Content-Type: application/json] {"Expression":"1 + 1"}
                                                              -> 400 invalid_request                                               # key matched case-insensitively (open question Q5)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 + 1"}{}
                                                              -> 400 invalid_request                                               # data after the object ignored
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 + 1"}x
                                                              -> 400 invalid_request                                               # trailing bytes ignored
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 + 1"
                                                              -> 400 invalid_request                                               # truncated JSON not reported
POST /api/v1/calculations [Content-Type: application/json] (empty body)
                                                              -> 400 invalid_request                                               # empty body treated as a valid, empty request (gives 422)
```

## 2.5 Body size (rule 6)

Rule 6: a body over 1 MiB (1,048,576 bytes) is 400 `invalid_request`. Both cases
below are a JSON object whose expression is `"1"`, padded with spaces inside the
object after the `{` so that the total size is exact.

```text
POST /api/v1/calculations [Content-Type: application/json], body exactly 1,048,576 bytes
                                                              -> 200 result 1                                                      # exact limit refused (off by one)
POST /api/v1/calculations [Content-Type: application/json], body exactly 1,048,577 bytes
                                                              -> 400 invalid_request                                               # limit not enforced (gives 200)
```

## 2.6 Shape versus value (rule 7)

Rule 7: a request that is not a JSON object with a string `expression` is 400.
Once the shape is right, the string goes to the calculator unchanged. An empty
string is 422, not 400.

```text
POST /api/v1/calculations [Content-Type: application/json] {"expression":""}
                                                              -> 422 invalid_expression                                            # empty string rejected as a shape error (400)
POST /api/v1/calculations [Content-Type: application/json] {"expression":5}
                                                              -> 400 invalid_request                                               # non-string accepted
POST /api/v1/calculations [Content-Type: application/json] []
                                                              -> 400 invalid_request                                               # array accepted as an object
POST /api/v1/calculations [Content-Type: application/json] "1 + 1"
                                                              -> 400 invalid_request                                               # top-level string accepted
POST /api/v1/calculations [Content-Type: application/json] null
                                                              -> 400 invalid_request                                               # null accepted as an object (gives 422)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"2 + 3"}
                                                              -> 200 result 5                                                      # JSON escapes checked before decoding
```

## 2.7 Domain errors mapped to status and code (rule 8; api.md Errors)

Rule 8: each domain error maps to one status and one code, using `errors.Is`.
Length and syntax errors are 422 too.

```text
POST /api/v1/calculations [Content-Type: application/json] {"expression":"2 +"}
                                                              -> 422 invalid_expression                                            # syntax error not mapped
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 / 0"}
                                                              -> 422 division_by_zero                                              # division error not mapped (doc example)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"sqrt(-1)"}
                                                              -> 422 negative_square_root                                          # unmapped, falls to 500
POST /api/v1/calculations [Content-Type: application/json] {"expression":"(-8) ^ 0.5"}
                                                              -> 422 undefined_result                                              # unmapped, falls to 500
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 / (1e308 * 10)"}
                                                              -> 422 result_out_of_range                                           # unmapped, falls to 500
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1" + " + 1" × 250}   (1,001 chars)
                                                              -> 422 invalid_expression                                            # length error reported as 400
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1" + " + 1" × 249 + "   "}   (1,000 chars)
                                                              -> 200 result 250                                                    # limit at HTTP off by one
```

## 2.8 Messages (rule 9)

Rule 9: for a calculator error, `message` is the text of the domain error. Any
other message describes the problem without echoing the request body.

```text
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 / 0"}
                                                              -> 422 division_by_zero; message "cannot divide by zero"             # message not the domain text
POST /api/v1/calculations [Content-Type: application/json] {"expression":"2 +"}
                                                              -> 422 invalid_expression; message starts with "invalid expression"  # exact wording open (Q9)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"1 + 1","secret":"XYZ123"}
                                                              -> 400 invalid_request; message does not contain XYZ123              # unknown field value echoed in message
POST /api/v1/calculations [Content-Type: application/json] XYZ123 (raw body, not JSON)
                                                              -> 400 invalid_request; message does not contain XYZ123              # syntax error echoes the request body
```

## 2.9 Unexpected failures (rule 10)

No case. `NewHandler()` takes no dependencies, so no request can make it fail
unexpectedly from the outside. See Q1.

## 2.10 Successful responses and health (api.md)

```text
POST /api/v1/calculations [Content-Type: application/json] {"expression":"2 + 3 * 4"}
                                                              -> 200 {"result":14}                                                 # success body or shape wrong (doc example)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"0.1 + 0.2"}
                                                              -> 200 {"result":0.3}                                                # unrounded float written to JSON
POST /api/v1/calculations [Content-Type: application/json] {"expression":"-0"}
                                                              -> 200 {"result":0}                                                  # JSON encoder writes -0 as "-0"
GET /api/v1/health                                            -> 200 {"status":"ok"}                                               # health body or status wrong
```

## 2.11 Order of checks (api.md: path and method, content type, shape, syntax, evaluation)

Rule (api.md): checks run in that order; the first failure is reported.

```text
PUT /api/v1/calculations [Content-Type: text/plain] {"expression":"1 + 1"}
                                                              -> 405 method_not_allowed; Allow includes POST                       # content type checked before method
POST /api/v1/nope [Content-Type: text/plain] {"expression":"1 + 1"}
                                                              -> 404 not_found                                                     # content type checked before path
POST /api/v1/calculations [Content-Type: text/plain] {"expression":"2 +"}
                                                              -> 415 unsupported_media_type                                        # syntax error reported before content type
POST /api/v1/calculations [no Content-Type] (empty body)
                                                              -> 415 unsupported_media_type                                        # empty body reported as 400 before content type
POST /api/v1/calculations [Content-Type: application/json] {"expression":"2 +","x":1}
                                                              -> 400 invalid_request                                               # syntax error (422) reported before unknown field (400)
POST /api/v1/calculations [Content-Type: application/json] {"expression":"<1,001 chars>","x":1}
                                                              -> 400 invalid_request                                               # length (422) reported before shape (400)
```

---

# Open questions and rules I could not turn into a case

1. **Q1, rule 10 and `internal_error` (500).** `NewHandler()` takes no arguments, so
   no input reaches an unexpected error, and the 500 status and its `code` cannot be
   tested from outside. Should the test build the handler from an internal
   constructor with a stub calculator, or drop the 500 case?
2. **Q2, logging.** "We log the cause" is not visible in the response. Should a test
   capture logs through an injected logger, or is it out of scope?
3. **Q3, whitespace after the JSON object.** SPEC rejects "data after the object";
   api.md says "nothing after it". Is `{"expression":"1 + 1"}\n` allowed? No case written.
4. **Q4, duplicate `expression` keys.** Go keeps the last value. Should a duplicate be
   400, or the last value? No case written.
5. **Q5, key case.** Go matches keys case-insensitively, so `{"Expression":...}` would
   be read as `expression`. I assumed it is an unknown field and so 400. Neither doc
   says this; please confirm.
6. **Q6, trailing slash.** Is `/api/v1/calculations/` a 404 (undefined path) or a
   redirect? Neither doc says. No case written.
7. **Q7, `HEAD` and the `Allow` value.** Does `HEAD` on health count as accepted? Should
   `Allow` also list `OPTIONS`? Neither doc says.
8. **Q8, `Access-Control-Allow-Methods`.** Its exact value is not defined. The cases
   only require that it includes the path's methods. Should it also include `OPTIONS`?
9. **Q9, wrapped messages.** SPEC says `ErrInvalidExpression` may be wrapped with a
   reason, and rule 9 says `message` is the domain error's text. Which exact message
   is expected for `2 +`: the bare text, or the wrapped text? The case in 2.8 only
   checks the prefix until this is decided.
10. **Q10, literal too small.** `1e-400` is not too large, so it is not `ErrInvalidExpression`
    by the literal rule. `strconv.ParseFloat` returns 0 without error. The underflow rule
    covers results only. Is `1e-400` 0, or invalid? No case written.
11. **Q11, underflow used as a divisor.** `1 / (1e-200 * 1e-200)` is written as
    `ErrDivisionByZero`, because the product underflows to a zero divisor. Confirm this
    is intended, or say whether underflow should be exempt from the zero-divisor check.
12. **Q12, rounding ties.** Exactly half-way cases at the 15th digit are not
    specified. Example: `1234567890123464 + 1` (exactly `1234567890123465`) gives
    `1234567890123460` with round-half-even and `1234567890123470` with round-half-up.
    No case written; which mode?
13. **Q13, "within rounding distance" of the largest number.** api.md's wording could
    include values somewhat below the maximum. The cases follow SPEC rule 14: a result
    is out of range only if it rounds to infinity. Confirm.
14. **Q14, `sqrt(-0)`.** The case assumes `-0` is not negative and returns 0. Confirm.
15. **Q15, leading zeros and spacing in `sqrt (16)`.** `007` and `sqrt (16)` are accepted
    because the grammar allows them. Confirm both.
16. **Q16, the health route.** SPEC does not mention `GET /api/v1/health` at all. Its
    `405`, `Allow` and CORS behaviour come only from the general rules. Should SPEC list it?
17. **Q17, field names in messages.** Go's unknown-field error includes the field name
    (`unknown field "x"`). Rule 9 forbids echoing the request body. Does a field name
    count as an echo? The case in 2.8 checks only the value.
18. **Q18, JSON number text.** Cases compare results by value. Is a fixed text form
    required (for example `1e21` against the full digits)?
19. **Not cased, not observable.** Unary minus against `*` and `/`, `%` against `*`,
    and `sqrt` against `^` give the same value under any input. Not cased, so there is
    no case that separates them. `cmd/server` (PORT, timeouts, shutdown) is wiring and
    has no cases, as SPEC says.

# Places where the two documents disagree

- **D1, OPTIONS.** api.md: "an OPTIONS preflight gets a 204". SPEC rule 3: "an OPTIONS
  request to any path gets a 204", with no preflight condition. The cases use the SPEC
  reading (2.2, the bare OPTIONS to an undefined path). Which one is intended?
- **D2, Content-Type on empty responses.** api.md: "Every response, errors included, is
  application/json". SPEC rule 11: "every response with a body". Only the 204 differs.
  The cases follow SPEC.
- **D3, the largest-number boundary.** api.md: "a result within rounding distance of the
  largest representable number is reported as result_out_of_range". SPEC rule 14 says
  only results that round to infinity. api.md reads wider. See Q13.
- **D4, underflow.** api.md says underflow is not an error. SPEC does not say whether an
  intermediate that underflows to zero is a zero divisor, and rule 8 would then make it
  an error. See Q11.
