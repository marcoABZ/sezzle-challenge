# Prompts

This file contain the prompts used for this implementation, alongside the reasoning behind each one of them.

### 1. Test cases definition

- **Model:** Claude Haiku
- **Goal:** Help to complete the SPEC.md that will be used by the agent responsible for implementing the backend. SPEC.md was mostly written by hand, and the prompt was used mainly to make sure the test table was complete and that no edge case was forgotten. Since the application is quite simple and there aren't many edge cases, a smaller model was used.
- **Prompt backend:**
> I want you to act as the QA engineer for the backend of this calculator.
In this session you only design test cases. Don't write tests or any
other code.
>
> Read docs/api.md and backend/SPEC.md. They are the only source of truth.
There is no implementation yet, so don't look for one and don't assume
one.
>
> Write to backend/TEST_CASES.md the test cases we need to prove that an
implementation follows those two documents. Don't change any other file.
>
> Split the file in two parts:
> 1. Calculator: cases for Evaluate(expression).
> 2. HTTP: cases for the handler returned by NewHandler().
>
> Format
> - Group the cases under the rule they test, with the rule in one line.
> - One case per line, followed by the mistake it would catch:
    "2 + 3 * 4" -> 14    # evaluated left to right, ignoring precedence
    "1 / 0" -> ErrDivisionByZero    # no zero-divisor check
    POST /api/v1/calculations {"expression":"2 +"} -> 422 invalid_expression    # syntax error not mapped
> - For an HTTP case include the method, the path, any header that
  matters, the body, the expected status, the expected code or result,
  and any response header the rule requires.
> - No tables and no Go code.
>
> What the cases must cover
> - Every rule in both documents, with at least one case that passes and
  one that fails wherever the rule can fail.
> - Every line of the grammar, accepted and rejected forms.
> - Precedence: every pair of neighbouring levels, in both orders.
> - Associativity: three operands at every level that has it.
> - The minus sign in every position where it is allowed: at the start,
  after an operator, after an open parenthesis, in an exponent, and
  repeated.
> - Parentheses: nested, redundant, empty, unopened and unclosed.
> - Numbers: every accepted form, and every look-alike the spec rejects.
> - The length limit: exactly at the limit and one character over.
> - Every arithmetic error, at the top of an expression and inside
  parentheses.
> - Every ordering rule, with an expression or a request that breaks two
  rules at once and shows which one is reported.
> - The final result policy: decimal noise like 0.1 + 0.2, the 15-digit
  limit, negative zero, underflow, overflow in an intermediate step, and
  the largest representable number.
> - Every error code and every status in docs/api.md.
> - No padding. If two cases would catch the same mistake, keep only one.
>
> Accuracy
> - Never write an expected number from memory. First work out by hand
  the order the specs require, then compute the value with a throwaway
  Go program outside the repo that performs those steps, apply the final
  result policy, use what it prints, and delete the program.
> 
> Finish the file with two short lists:
> - Rules you could not turn into a case, or that you found ambiguous,
  with the question you would ask me.
> - Places where the two documents disagree.
>
> Stop when the file is written. I will review it before any test exists.

- **Prompt frontend:**

> I want you to act as the QA engineer for the frontend of this
calculator. In this session you only design test cases. Don't write
tests or any other code.
>
> Read docs/api.md and frontend/SPEC.md. They are the only source of
truth. There is no implementation yet, so don't look for one and don't
assume one.
>
> This pass is about behaviour only: the API client, the reducer and the
hook. Don't write cases about rendering, layout, styling, keyboard
shortcuts or accessibility. Those sections of the spec are not written
yet.
>
> Write to frontend/TEST_CASES.md the test cases we need to prove that an
implementation follows those two documents. Don't change any other file.
>
> Split the file in three parts:
> 1. Reducer: cases for reduce(state, action), as sequences of keys.
> 2. API client: cases for calculate(expression).
> 3. Hook: cases for useCalculator() with the API client replaced by a fake.
>
> Format
> - Group the cases under the rule they test, with the rule in one line.
> - One case per line, followed by the mistake it would catch.
> - A reducer case lists the keys pressed, the request the state asks
  for, the answer the test gives it, and the expression, result and
  error at the end:
    sqrt 1 6 equals | sends "sqrt(16)" -> 4 | expression "√(16)", result "4", error null    # open parenthesis not closed on equals
> - A client case gives the response the fake fetch returns and what
  calculate must resolve or reject with.
> - A hook case gives the keys pressed, how the fake client answers, and
  what expression, result, error and busy must be, also while the answer
  is still pending.
> - No tables and no code.
>
> What the cases must cover
> - Every rule in frontend/SPEC.md, with at least one case each.
> - Every key, with its shown form and its sent form.
> - Typing numbers at the limits: a second decimal point, the sixteenth
  digit, decimal with no number, and zero followed by a digit. Check
  each rule again for a number that is not the first one in the
  expression.
> - That the frontend does not police syntax: a sequence the backend will
  reject is still typed and still sent.
> - Backspace on a digit, on an operator, on a square root and on an empty
  expression.
> - Equals on an empty expression, with no open parenthesis, with one and
  with several.
> - After a result: every kind of key, a negative result continued with
  each operator, and a result in exponent form.
> - Every error text, that the expression is kept as typed, and the
  recovery with clear and with another key.
> - Key presses while a request is pending.
> - The client: success, each documented error, a failed fetch, a response
  that is not JSON, and JSON in the wrong shape.
> - No padding. If two cases would catch the same mistake, keep only one.
>
> Finish the file with two short lists:
> - Rules you could not turn into a case, or that you found ambiguous,
  with the question you would ask me.
> - Places where the two documents disagree.
>
> Stop when the file is written. I will review it before any test exists.
