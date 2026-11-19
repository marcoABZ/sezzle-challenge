# Frontend spec

A keypad calculator in React, TypeScript and Vite. It follows the
contract in [`docs/api.md`](../docs/api.md).

Here we specify behaviour: what the calculator does. Screen design and
accessibility have their own sections at the end and will be written
later. The test cases come from this file and from the contract, and
live in `TEST_CASES.md`.

## Principle

The frontend is an editor for an expression. The backend is the
calculator. The browser does no arithmetic and doesn't decide the order
of operations: it sends the expression once, on equals, and shows what
comes back.

So the frontend doesn't check if an expression is well formed. It
applies the few rules below about typing numbers, and the backend judges
everything else.

## Layers

API client (`src/api/client.ts`): the only place with a `fetch`. It
turns a response into a number or an `ApiError` and knows nothing about
React.

State (`src/hooks/calculatorState.ts`): a pure reducer. Key presses and
API outcomes go in, the next state comes out. All the behaviour lives
here, so we test it as sequences of keys, with nothing rendered. It
never calls the API or touches the DOM.

Hook (`src/hooks/useCalculator.ts`): holds the state and performs the
request the state asks for. It decides no behaviour.

Components (`src/components/`): render and forward events. They can't
import `src/api` or call `fetch` (the linter enforces it).

## Public surface

The tests are written against these names before any implementation
exists, so they are fixed.

```ts
// src/api/client.ts
export class ApiError extends Error {
  code: string    // from the API, or 'network_error' / 'invalid_response'
  status: number  // HTTP status, 0 when there was no response
}

export function calculate(expression: string): Promise<number>
```

```ts
// src/hooks/calculatorState.ts
export type Key =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'decimal'
  | 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percentage'
  | 'sqrt' | 'open_paren' | 'close_paren'
  | 'clear' | 'backspace' | 'equals'

export type Action =
  | { type: 'key'; key: Key }
  | { type: 'resolved'; result: number }
  | { type: 'rejected'; message: string }

export type State = {
  expression: string       // what has been typed, as shown: "2+3×4"
  result: string | null    // set after a successful equals
  error: string | null
  request: { expression: string } | null  // as sent: "2+3*4". Set while waiting
  // plus whatever private fields the reducer needs
}

export const initialState: State
export function reduce(state: State, action: Action): State
```

```ts
// src/hooks/useCalculator.ts
export function useCalculator(): {
  expression: string
  result: string | null
  error: string | null
  busy: boolean
  press: (key: Key) => void
}
```

## API client

1. It sends a `POST` to `/calculations` under a base URL that comes from
   `VITE_API_BASE_URL` (default `/api/v1`). The body is
   `{ "expression": ... }` and the request has
   `Content-Type: application/json`.
2. A `200` resolves with `result`.
3. An error response in the documented shape rejects with an `ApiError`
   that has its `code`, its `message` and the status.
4. A failed `fetch` rejects with code `network_error` and status `0`.
5. Any other response (for example a proxy's HTML error page) rejects
   with code `invalid_response`.

## Keys and what they type

Each key adds text to the end of the expression. The expression has two
forms built from the same keys: the one we show and the one we send.

- Digits `0` to `9`: the digit, in both forms.
- `decimal`: `.` in both.
- `add`: `+` in both. `subtract`: `-` in both. `power`: `^` in both.
- `multiply`: shown as `×`, sent as `*`.
- `divide`: shown as `÷`, sent as `/`.
- `percentage`: `%` in both.
- `sqrt`: shown as `√(`, sent as `sqrt(`.
- `open_paren`: `(` in both. `close_paren`: `)` in both.

Neither form has spaces. There is no sign-change key: `subtract` also
types the minus sign, like in `2×-3`.

## Typing numbers

These are the only rules the frontend applies to what is typed.

1. The expression starts empty.
2. A second decimal point in the same number is ignored.
3. A number can have at most 15 digits. Extra digits are ignored.
4. `decimal` pressed where no number is being typed enters `0.`.
5. A number that is just `0` is replaced by the next digit, so typing
   `0` and then `7` gives `7`, not `07`.

Anything else is accepted as typed, including sequences the backend will
reject (for example two operators in a row).

## Editing

1. `backspace` removes the last character. `√(` is removed as one. On an
   empty expression it does nothing.
2. `clear` empties the expression, the result and the error.

## Equals

1. On an empty expression, `equals` does nothing.
2. Otherwise it closes every parenthesis that is still open and sends
   the expression in one request. `√(16` is sent as `sqrt(16)`.
3. While the request is pending, every key press is ignored and `busy`
   is true.
4. On success, `result` is the number as JavaScript prints it
   (`String(result)`), and `expression` is what was sent, in its shown
   form, including the parentheses that were closed.

## After a result

1. A digit, `decimal`, `open_paren` or `sqrt` starts a new expression.
2. `add`, `subtract`, `multiply`, `divide`, `power` and `percentage`
   continue from the result: the new expression starts with the text of
   the result, followed by the key.
3. A negative result is wrapped in parentheses when we continue from it,
   because the power operator binds tighter than a minus sign. After a
   result of `-5`, pressing `power` and then `2` gives `(-5)^2`, which
   is `25`, and not `-5^2`, which is `-25`.
4. `close_paren`, `backspace` and `equals` do nothing after a result.

## Errors

1. When a request fails, `error` is set and the expression is kept
   exactly as it was typed (without the parentheses equals would have
   closed), so it can be fixed.
2. The next key press clears the error and is then applied to the kept
   expression. `clear` empties everything.
3. The display mimics a pocket calculator, so an error is a short text.
   We pick it by the `code` of the error, never by the `message` text of
   the API:
   - `invalid_expression`: Invalid input
   - `division_by_zero`: Cannot divide by zero
   - `negative_square_root` and `undefined_result`: Invalid input
   - `result_out_of_range`: Overflow
   - `network_error`: No connection
   - anything else: Error

## Hook

1. `press` is the only way in. It is called from event handlers.
2. When a key press produces a state with a `request`, the hook calls
   `calculate` once with `request.expression` and dispatches `resolved`
   or `rejected`.
3. The call starts from the key-press handler, not from an effect.
4. `rejected` carries the display text from the list above.

## Coverage

90% minimum on lines, functions, branches and statements, enforced in
CI. The entry file and the test files are left out.

## Not in scope

History, memory keys, a sign-change key, checking expression syntax in
the browser, and any arithmetic in the browser.

## Screen

To be specified.

## Accessibility

To be specified.