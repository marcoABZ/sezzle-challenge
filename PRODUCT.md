# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, reviewers first.

- Reviewers of the exercise: engineers who run the project with
  `make up`, push on the edge cases (errors, parentheses, results in
  exponent form, keyboard input) and judge the quality of the code and
  the UI.
- Everyday users: people who need quick arithmetic on a phone or a
  laptop and expect it to behave like the calculator they already know.

## Product Purpose

A full-stack calculator. The Go API evaluates expressions; the React app
is a keypad that edits an expression and shows what the API answers.
Success is a calculator that a reviewer cannot trip up, and that an
everyday user picks up without reading anything.

## Positioning

The browser does no arithmetic. The keypad builds a whole expression,
with precedence, parentheses, power, percent and square root, and sends
it once on equals. The backend is the single judge of the result and of
every error, so any caller of the API gets the same answer.

## Operating Context

- On a phone it is used like the calculator app the OS ships: one hand,
  thumbs, full screen.
- On a desktop it sits centred in the window and is driven as much from
  the physical keyboard as with the mouse.
- Reviewers read the repo next to the running app: `docs/api.md`,
  `frontend/SPEC.md`, `PROMPTS.md`.

## Capabilities and Constraints

- Keys: digits, decimal point, `+ - × ÷`, power, percent, square root,
  open and close parenthesis, clear, backspace, equals. No history, no
  memory keys, no sign-change key (`-` types the minus sign).
- Typing rules and error texts are fixed in `frontend/SPEC.md`. Error
  texts are short, pocket-calculator style: Invalid input, Cannot divide
  by zero, Overflow, No connection, Error.
- While a request is pending every key is ignored.
- Results can come back in exponent form (`1e+21`) and with up to 15
  significant digits; the display has to hold them.
- Keyboard interaction is required.
- React, TypeScript and Vite. No UI kit, no CSS framework, no new
  dependencies without approval.
- `frontend/SPEC.md` leaves Screen and Accessibility to be specified.

## Evidence on Hand

None: no logo, no brand assets, no copy beyond the error texts in the
spec. Nothing should be invented to fill that gap.

## Product Principles

1. The backend is the calculator; the screen only edits and reports.
2. Behave like the calculator people already know before being clever.
3. Every edge case has a visible, honest state: pending, error, result.
4. Keyboard and touch are equal citizens.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast, a visible focus indicator, an accessible name on
every key, results and errors announced to screen readers, and reduced
motion respected. Full operation from the keyboard.
