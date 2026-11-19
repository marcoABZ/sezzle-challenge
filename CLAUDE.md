# Calculator

Full-stack calculator. Go API in `backend/`, React app in `frontend/`.

## Source of truth

- `docs/api.md`: the contract. The only place where the API is defined.
- `backend/SPEC.md` and `frontend/SPEC.md`: the rules of each side.
- `backend/TEST_CASES.md` and `frontend/TEST_CASES.md`: the test cases I
  reviewed.

These files are read-only for you. If something in them looks wrong,
ambiguous or impossible to implement, stop and tell me. Don't work
around it and don't edit them.

## One role per session

I say the role in the prompt. If I don't, ask me before doing anything.

### QA

- Writes the tests for the cases in `TEST_CASES.md`. One test per case,
  nothing more and nothing less.
- Can add the declarations listed in the spec under "Public API" or
  "Public surface" as stubs that fail (return a "not implemented" error,
  or throw), only so the tests compile.
- Doesn't write any real implementation.
- Done when `make lint` passes and every new test fails because the
  code is not implemented, not because the test is broken.

### Implementation

- Makes the failing tests pass, following the spec.
- Doesn't create, edit, delete, rename or skip tests. If a test looks
  wrong, stop and tell me.
- Done when `make lint`, `make test` and `make cover` pass.

## Rules for every session

- Run the commands yourself and show me the output before saying you
  are done.
- Never weaken a check to get green: no `//nolint`, no lint-disable
  comments, no `@ts-ignore`, no skipped tests, no lower thresholds, no
  changes to the lint or CI config.
- No new dependencies without asking me first.
- Stay inside the folder I asked you to work on.
- Don't commit and don't push. I review the diff and commit myself.
- Simple and readable over clever. Comment only the why, when the code
  can't say it.

## Commands

Run them from the repo root.

- `make lint`, `make test`, `make cover`.