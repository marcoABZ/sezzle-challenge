# Prompts

This file contains the prompts used for this implementation, alongside the reasoning behind each one of them.

Every step followed the same loop. I wrote the contract (`docs/api.md`) and the specs mostly by hand. A model turned them into test cases, which I reviewed. Then a QA session wrote one test per case, and a separate Implementation session made the tests pass without touching them. The standing rules for both roles are in `CLAUDE.md`.

Only the prompt that starts each session is listed. Short follow-ups inside a session are left out.

### 1. Test cases definition

- **Model:** Claude Haiku
- **Goal:** Help to complete the SPEC.md that will be used by the agent responsible for implementing the backend. SPEC.md was mostly written by hand, and the prompt was used mainly to make sure the test table was complete and that no edge case was forgotten. Since the application is quite simple and there aren't many edge cases, a smaller model was used.
- **Prompt backend:**

> I want you to act as the QA engineer for the backend of this calculator.
> In this session you only design test cases. Don't write tests or any
> other code.
>
> Read docs/api.md and backend/SPEC.md. They are the only source of truth.
> There is no implementation yet, so don't look for one and don't assume
> one.
>
> Write to backend/TEST_CASES.md the test cases we need to prove that an
> implementation follows those two documents. Don't change any other file.
>
> Split the file in two parts:
>
> 1. Calculator: cases for Evaluate(expression).
> 2. HTTP: cases for the handler returned by NewHandler().
>
> Format
>
> - Group the cases under the rule they test, with the rule in one line.
> - One case per line, followed by the mistake it would catch:
>   "2 + 3 * 4" -> 14    # evaluated left to right, ignoring precedence
>   "1 / 0" -> ErrDivisionByZero    # no zero-divisor check
>   POST /api/v1/calculations {"expression":"2 +"} -> 422 invalid_expression    # syntax error not mapped
> - For an HTTP case include the method, the path, any header that
>   matters, the body, the expected status, the expected code or result,
>   and any response header the rule requires.
> - No tables and no Go code.
>
> What the cases must cover
>
> - Every rule in both documents, with at least one case that passes and
>   one that fails wherever the rule can fail.
> - Every line of the grammar, accepted and rejected forms.
> - Precedence: every pair of neighbouring levels, in both orders.
> - Associativity: three operands at every level that has it.
> - The minus sign in every position where it is allowed: at the start,
>   after an operator, after an open parenthesis, in an exponent, and
>   repeated.
> - Parentheses: nested, redundant, empty, unopened and unclosed.
> - Numbers: every accepted form, and every look-alike the spec rejects.
> - The length limit: exactly at the limit and one character over.
> - Every arithmetic error, at the top of an expression and inside
>   parentheses.
> - Every ordering rule, with an expression or a request that breaks two
>   rules at once and shows which one is reported.
> - The final result policy: decimal noise like 0.1 + 0.2, the 15-digit
>   limit, negative zero, underflow, overflow in an intermediate step, and
>   the largest representable number.
> - Every error code and every status in docs/api.md.
> - No padding. If two cases would catch the same mistake, keep only one.
>
> Accuracy
>
> - Never write an expected number from memory. First work out by hand
>   the order the specs require, then compute the value with a throwaway
>   Go program outside the repo that performs those steps, apply the final
>   result policy, use what it prints, and delete the program.
>
> Finish the file with two short lists:
>
> - Rules you could not turn into a case, or that you found ambiguous,
>   with the question you would ask me.
> - Places where the two documents disagree.
>
> Stop when the file is written. I will review it before any test exists.

- **Prompt frontend:**

> I want you to act as the QA engineer for the frontend of this
> calculator. In this session you only design test cases. Don't write
> tests or any other code.
>
> Read docs/api.md and frontend/SPEC.md. They are the only source of
> truth. There is no implementation yet, so don't look for one and don't
> assume one.
>
> This pass is about behaviour only: the API client, the reducer and the
> hook. Don't write cases about rendering, layout, styling, keyboard
> shortcuts or accessibility. Those sections of the spec are not written
> yet.
>
> Write to frontend/TEST_CASES.md the test cases we need to prove that an
> implementation follows those two documents. Don't change any other file.
>
> Split the file in three parts:
>
> 1. Reducer: cases for reduce(state, action), as sequences of keys.
> 2. API client: cases for calculate(expression).
> 3. Hook: cases for useCalculator() with the API client replaced by a fake.
>
> Format
>
> - Group the cases under the rule they test, with the rule in one line.
> - One case per line, followed by the mistake it would catch.
> - A reducer case lists the keys pressed, the request the state asks
>   for, the answer the test gives it, and the expression, result and
>   error at the end:
>   sqrt 1 6 equals | sends "sqrt(16)" -> 4 | expression "√(16)", result "4", error null    # open parenthesis not closed on equals
> - A client case gives the response the fake fetch returns and what
>   calculate must resolve or reject with.
> - A hook case gives the keys pressed, how the fake client answers, and
>   what expression, result, error and busy must be, also while the answer
>   is still pending.
> - No tables and no code.
>
> What the cases must cover
>
> - Every rule in frontend/SPEC.md, with at least one case each.
> - Every key, with its shown form and its sent form.
> - Typing numbers at the limits: a second decimal point, the sixteenth
>   digit, decimal with no number, and zero followed by a digit. Check
>   each rule again for a number that is not the first one in the
>   expression.
> - That the frontend does not police syntax: a sequence the backend will
>   reject is still typed and still sent.
> - Backspace on a digit, on an operator, on a square root and on an empty
>   expression.
> - Equals on an empty expression, with no open parenthesis, with one and
>   with several.
> - After a result: every kind of key, a negative result continued with
>   each operator, and a result in exponent form.
> - Every error text, that the expression is kept as typed, and the
>   recovery with clear and with another key.
> - Key presses while a request is pending.
> - The client: success, each documented error, a failed fetch, a response
>   that is not JSON, and JSON in the wrong shape.
> - No padding. If two cases would catch the same mistake, keep only one.
>
> Finish the file with two short lists:
>
> - Rules you could not turn into a case, or that you found ambiguous,
>   with the question you would ask me.
> - Places where the two documents disagree.
>
> Stop when the file is written. I will review it before any test exists.

### 2. Implementation loops

#### 2.1. Calculator domain

- **Model:** Claude Opus
- **Goal:** Start the actual implementation by writing tests for the calculator domain logic. After tests were validated, start implementation agent
- **Prompt QA:**

> Role: QA.
>
> Write the tests for part 1 (Calculator) of backend/TEST_CASES.md, in
> backend/internal/calculator.
>
> - One table row per case, in the same order and with the same grouping
>   as the file. Don't add, drop or change cases. If a case looks wrong or
>   you can't express it as a test, stop and tell me.
> - Add only the stubs the tests need to compile: Evaluate and the
>   sentinel errors from the "Public API" section of backend/SPEC.md.
>   Evaluate must return a "not implemented" error, not one of the
>   sentinel errors.
> - Don't touch part 2 (HTTP) or internal/httpapi yet.
>
> When you finish, run make lint and make test and show me
> the output. Lint must pass. Every test must fail, and only because
> Evaluate is not implemented.
>
> Then tell me how many cases part 1 of TEST_CASES.md has and how many
> test rows you wrote.

- **Prompt impl:**

> Role: Implementation.
>
> Implement backend/internal/calculator so the tests in that package pass,
> following backend/SPEC.md and docs/api.md.
>
> - Replace the stub. Keep the public API exactly as the spec defines it.
> - Follow the grammar and the rules of the spec: tokenise, then parse,
>   then evaluate.
> - Don't touch the test files. If you think a test is wrong, stop and
>   tell me which one and why. Don't make it pass with a special case.
> - No code that looks at specific test inputs. Implement the rules, not
>   the examples.
> - Stay inside backend/internal/calculator.
>
> When you finish, run make lint-backend, make test-backend and
> make cover-backend and show me the output.
>
> Then tell me:
>
> - any rule of the spec you found ambiguous, and how you decided,
> - anything you implemented that no test covers.

#### 2.2. HTTP API

- **Model:** Claude Opus
- **Goal:** Same loop for the HTTP layer. The tests go through `NewHandler()` with `httptest`, so no real network is needed. The handler only decodes the request, calls the domain and maps its errors to a status and a code, so no arithmetic leaks into this package.
- **Prompt QA:**

> Role: QA.
>
> Write the tests for part 2 (HTTP) of backend/TEST_CASES.md, in
> backend/internal/httpapi.
>
> - One table row per case, in the same order and with the same grouping
>   as the file. Don't add, drop or change cases. If a case looks wrong or
>   you can't express it as a test, stop and tell me.
> - The tests go through NewHandler() with net/http/httptest. No real
>   network.
> - Add only the stub the tests need to compile: NewHandler, returning a
>   handler that answers every request with 501.
> - Don't touch internal/calculator or part 1.
>
> When you finish, run make lint and make test and show me
> the output. Lint must pass. The calculator tests must still pass. Every
> new test must fail, and only because the handler is not implemented.
>
> Then tell me how many cases part 2 has and how many test rows you wrote.

- **Prompt impl:**

> Role: Implementation.
>
> Implement backend/internal/httpapi so the tests in that package pass,
> following backend/SPEC.md and docs/api.md. Then wire backend/cmd/server
> as the spec describes.
>
> - Replace the stub. Keep NewHandler() exactly as the spec defines it.
> - The handler calls calculator.Evaluate. No arithmetic and nothing about
>   expression syntax in this package.
> - Map domain errors to a status and code in exactly one place.
> - Don't touch the test files or internal/calculator. If you think a test
>   is wrong, stop and tell me which one and why.
> - Stay inside backend/internal/httpapi and backend/cmd/server.
>
> When you finish, run make lint-backend, make test-backend and
> make cover-backend and show me the output.
>
> Then tell me:
>
> - any rule of the spec you found ambiguous, and how you decided,
> - anything you implemented that no test covers,
> - how I can check cmd/server by hand.

#### 2.3. Frontend behaviour: reducer, API client and hook

- **Model:** Claude Opus
- **Goal:** Build the frontend's behaviour before any component exists. All of it lives in a pure reducer, so it is tested as sequences of key presses with nothing rendered. The hook only holds the state and sends the request the state asks for, and the client is the only place that calls `fetch`.
- **Prompt QA:**

> Role: QA.
>
> Write the tests for frontend/TEST_CASES.md (reducer, API client and
> hook), in frontend/src.
>
> - One test per case, in the same order and with the same grouping as the
>   file. Don't add, drop or change cases. If a case looks wrong or you
>   can't express it as a test, stop and tell me.
> - Test files go next to the code: src/hooks/calculatorState.test.ts,
>   src/api/client.test.ts and src/hooks/useCalculator.test.ts.
> - Add only the stubs the tests need to compile: the names under "Public
>   surface" in frontend/SPEC.md. Functions throw "not implemented", and
>   initialState is a valid State.
> - No components and no rendering tests yet.
>
> When you finish, run make lint-frontend and make test-frontend and show
> me the output. Lint and the type check must pass. The existing App test
> must still pass. Every new test must fail, and only because the code is
> not implemented. A test that only reads initialState can pass; list
> those for me.
>
> Then tell me how many cases each part of TEST_CASES.md has and how many
> tests you wrote for each.

- **Prompt impl:**

> Role: Implementation.
>
> Implement src/api/client.ts, src/hooks/calculatorState.ts and
> src/hooks/useCalculator.ts so the tests pass, following frontend/SPEC.md
> and docs/api.md.
>
> - Replace the stubs. Keep the public surface exactly as the spec defines
>   it.
> - All the behaviour goes in the reducer. The hook only holds the state
>   and performs the request the state asks for, from the key-press
>   handler and not from an effect.
> - Don't touch the test files. If you think a test is wrong, stop and
>   tell me which one and why.
> - No code that looks at specific test inputs.
> - No components yet. Stay inside src/api and src/hooks.
>
> When you finish, run make lint-frontend, make test-frontend and
> make cover-frontend and show me the output.
>
> Then tell me:
>
> - any rule of the spec you found ambiguous, and how you decided,
> - anything you implemented that no test covers.

#### 2.4. Frontend components

- **Model:** Claude Opus
- **Goal:** Test the screen, the keyboard and accessibility through `<App />`, the way a user or a screen reader finds things: by role and accessible name. The components were built first, in a separate UI design session, so this pass runs the loop the other way around. Every test must pass on its first run, and the last question checks that each test would really catch the mistake its case describes.
- **Prompt QA:**

> Role: QA.
>
> Write the tests for part 4 (Components) of frontend/TEST_CASES.md, in
> frontend/src/components/Calculator.test.tsx.
>
> - One `it.each` row per case, in the same order and with the same
>   grouping as the file, with the case in the test name. Don't add, drop
>   or change cases. If a case looks wrong or you can't express it as a
>   test, stop and tell me.
> - Render `<App />` and replace `src/api/client.ts` with `vi.mock`, as the
>   hook tests do. Find elements by role and accessible name, and interact
>   with `user-event`. No snapshots and no test ids.
> - The components already exist, so write no stubs and no
>   implementation. Don't touch any file other than the new test file.
>   Leave src/App.test.tsx as it is.
> - Run the commands with the Node version in frontend/.nvmrc.
>
> When you finish, run make lint-frontend, make test-frontend and make
> cover-frontend and show me the output. Lint must pass. Because the
> components already exist, every new test must pass. If one fails, don't
> change the component or bend the test: stop and tell me which case, and
> whether you think the case or the component is wrong. If coverage stays
> under 90%, tell me which lines are uncovered. Don't add cases to cover
> them.
>
> Then tell me:
>
> - how many cases part 4 of TEST_CASES.md has, and how many test rows you
>   wrote,
> - any test that would still pass if the mistake in its case's comment
>   were made.
