# Frontend

React, TypeScript and Vite. Tests with Vitest and Testing Library. Read
`SPEC.md` and `../docs/api.md` before anything else.

## Layout

- `src/api/`: the API client. The only place that can call `fetch`.
- `src/hooks/`: `calculatorState.ts` (pure reducer) and
  `useCalculator.ts`.
- `src/components/`: rendering only. Can't import `src/api` or call
  `fetch` (oxlint fails).
- Tests live next to the code: `client.test.ts`,
  `calculatorState.test.ts` and so on.

## Tests

- One test per case in `TEST_CASES.md`. Use `it.each` tables and put the
  case in the test name.
- Import `describe`, `it`, `expect` and `vi` from `vitest`. We don't use
  globals.
- Reducer: plain function calls, nothing rendered.
- API client: replace `fetch` with `vi.stubGlobal` and restore it after
  each test. No real network.
- Hook: `renderHook` from Testing Library, with the client module
  replaced by `vi.mock`.
- Components (later): find elements by role and accessible name, and
  interact with `user-event`. No snapshot tests and no test ids.

## Code

- Function components and hooks only.
- No `any`, and no type assertion just to get around an error.
- No new libraries: no state library, no data-fetching library, no UI
  kit, no CSS framework.
- Type-only imports use `import type` (the tsconfig requires it).
- The tsconfig has `erasableSyntaxOnly`: no enums and no constructor
  parameter properties.
- Relative imports include the file extension (`./client.ts`), like the
  template does.
