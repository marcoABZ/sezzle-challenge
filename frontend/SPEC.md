# Frontend spec

A keypad calculator in React, TypeScript and Vite. It follows the
contract in [`docs/api.md`](../docs/api.md).

Here we specify behaviour: what the calculator does. Screen design and
accessibility have their own sections at the end. The test cases come
from this file and from the contract, and live in `TEST_CASES.md`.

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

The calculator is one screen: a display above a keypad.

### Keypad

1. 23 keys in four columns and six rows, in this order:

   ```
   Clear  (      )      Backspace
   √      xʸ     %      ÷
   7      8      9      ×
   4      5      6      −
   1      2      3      +
   0 (two columns)  .   =
   ```

2. Each key presses the `Key` of the same name. The power key's face reads
   xʸ, but it types `^` like any other way of pressing `power`.

### Display

1. With an empty expression it shows `0`.
2. While typing, it shows the expression in its shown form.
3. After a result, it shows the expression that was sent, with the result
   below it.
4. After an error, it shows the kept expression, with the error text below
   it.
5. A line longer than the display scrolls so that its end stays in view.
6. The display shows the state's text character for character. Styling may
   raise or widen a character (the `^`, a leading `-`) but never replace it.

### Sizes

1. Narrower than 640px, or shorter than 521px: the calculator fills the
   screen, like a phone's calculator app. A phone on its side (landscape, at
   most 520px tall) puts the display on the left and the keypad on the right.
2. Anything larger: the calculator is one object, about 384px wide, centred
   in the window.

### Keyboard

1. These physical keys press calculator keys:
   - `0` to `9`: the digit.
   - `.` and `,`: `decimal`.
   - `+`, `-`, `*` (also `x` and `X`), `/`, `^` and `%`: `add`,
     `subtract`, `multiply`, `divide`, `power` and `percentage`.
   - `r` and `R`: `sqrt`.
   - `(` and `)`: `open_paren` and `close_paren`.
   - `Enter` and `=`: `equals`.
   - `Backspace`: `backspace`.
   - `Escape` and `Delete`: `clear`.
2. A press with Ctrl, Cmd or Alt held belongs to the browser and presses
   nothing.
3. Any other key does nothing.
4. `Enter` always means `equals`, even when a key button has focus.
5. `Space` presses the focused key button, as browsers do.
6. A physical key press briefly lights its key on the keypad.
7. A screen at least 1024px wide, used with a mouse or trackpad, shows a
   legend of these keys next to the calculator.

## Accessibility

The target is WCAG 2.2 AA.

1. The page has one level-1 heading, "Calculator".
2. The keypad is a group named "Keypad", and every key is a button.
   - Digit buttons are named by their digit.
   - The other buttons are named Clear, Open parenthesis, Close
     parenthesis, Backspace, Square root, Power, Percent, Divide, Multiply,
     Minus, Plus, Decimal point and Equals.
3. The display is a region named "Display". It is `aria-busy` while a
   request is pending.
4. A polite status announces `Equals <result>` after a result, and the error
   text after an error. It stays empty while typing, so key presses are not
   read out twice.
5. Focus moves through the keys in keypad order, and the focused key shows a
   visible ring. A key lit by a physical key press gets no ring, so a press
   and focus never look alike.
6. Text meets AA contrast: 4.5:1, or 3:1 for large text.
7. With reduced motion, nothing turns or animates.
8. In forced-colours mode every key keeps a visible border.
