# Frontend test cases

Sections 1 to 3 cover behaviour: the API client, the reducer and the hook. Section 4 covers the components: rendering, the keyboard and accessibility. Sources: `docs/api.md` and `frontend/SPEC.md`. Layout, styling and motion have no cases.

Notation for the reducer part: key names are the `Key` values. `sends "..."` is the request the state asks for. The answer is `resolves N`, `rejects "display text"`, `none yet` (the answer has not arrived) or `no request`.

## 1. Reducer

### Initial state

Rule: the expression starts empty, with no result, no error and no request.

- no keys | no request | expression "", result null, error null  # initial state carries a stale value

### Each key: shown form and sent form

Rule: each key appends its shown form to the expression; the request carries its sent form.

- 1 2 3 4 5 6 7 8 9 0 equals | sends "1234567890" -> 1234567890 | expression "1234567890", result "1234567890", error null  # a digit mapped to the wrong character
- 1 decimal 5 equals | sends "1.5" -> 1.5 | expression "1.5", result "1.5", error null  # decimal sent or shown as a comma
- 2 add 3 equals | sends "2+3" -> 5 | expression "2+3", result "5", error null  # add not mapped to +
- 9 subtract 4 equals | sends "9-4" -> 5 | expression "9-4", result "5", error null  # subtract sent as a Unicode minus
- 2 multiply 3 equals | sends "2*3" -> 6 | expression "2×3", result "6", error null  # multiply shown as * or the sent form stored as the shown form
- 8 divide 2 equals | sends "8/2" -> 4 | expression "8÷2", result "4", error null  # divide shown as / or sent as ÷
- 2 power 3 equals | sends "2^3" -> 8 | expression "2^3", result "8", error null  # power sent as ** or shown as a different character
- 2 0 0 multiply 1 5 percentage equals | sends "200*15%" -> 30 | expression "200×15%", result "30", error null  # percentage dropped, or sent as /100
- sqrt 1 6 equals | sends "sqrt(16)" -> 4 | expression "√(16)", result "4", error null  # sqrt sent as the symbol √
- open_paren 2 add 3 close_paren multiply 4 equals | sends "(2+3)*4" -> 20 | expression "(2+3)×4", result "20", error null  # parentheses dropped from the sent form
- subtract 3 equals | sends "-3" -> -3 | expression "-3", result "-3", error null  # subtract at the start ignored, or a sign-change applied
- 2 multiply subtract 3 equals | sends "2*-3" -> -6 | expression "2×-3", result "-6", error null  # minus after an operator dropped, so no sign can be typed

### decimal where no number is being typed enters 0.

Rule: `decimal` where no number is being typed enters `0.`.

- decimal 5 equals | sends "0.5" -> 0.5 | expression "0.5", result "0.5", error null  # decimal at the start typed without the leading 0
- 2 add decimal 5 equals | sends "2+0.5" -> 2.5 | expression "2+0.5", result "2.5", error null  # the rule applied only at the start of the expression
- open_paren decimal 5 close_paren equals | sends "(0.5)" -> 0.5 | expression "(0.5)", result "0.5", error null  # decimal after an open parenthesis typed as ".5"

### A second decimal point in the same number is ignored

Rule: a second decimal point in the same number is ignored.

- 1 decimal 5 decimal 2 equals | sends "1.52" -> 1.52 | expression "1.52", result "1.52", error null  # second point appended
- 1 decimal decimal 5 equals | sends "1.5" -> 1.5 | expression "1.5", result "1.5", error null  # decimal after a point that was just typed appended
- 1 decimal 5 add 2 decimal 5 equals | sends "1.5+2.5" -> 4 | expression "1.5+2.5", result "4", error null  # a point in an earlier number blocks the point in a later number

### A number has at most 15 digits; extra digits are ignored

Rule: a number takes at most 15 digits; a digit typed after that is ignored.

- 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "123456789012345" -> 123456789012345 | expression "123456789012345", result "123456789012345", error null  # sixteenth digit kept
- 1 decimal 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "1.12345678901234" -> 1.12345678901234 | expression "1.12345678901234", result "1.12345678901234", error null  # limit counted only after the point, giving 16 digits
- 2 add 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "2+123456789012345" -> 123456789012347 | expression "2+123456789012345", result "123456789012347", error null  # limit counted over the whole expression, so the second number is cut short
- 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 backspace 9 equals | sends "123456789012349" -> 123456789012349 | expression "123456789012349", result "123456789012349", error null  # digit count not reduced by backspace, so the 9 is ignored

### Zero followed by a digit: the zero is replaced

Rule: a number that is just `0` is replaced by the next digit.

- 0 7 equals | sends "7" -> 7 | expression "7", result "7", error null  # "07" kept
- 2 add 0 7 equals | sends "2+7" -> 9 | expression "2+7", result "9", error null  # rule applied only to the first number
- 0 decimal 0 7 equals | sends "0.07" -> 0.07 | expression "0.07", result "0.07", error null  # zero replaced after the point, giving "0.7"

### Backspace

Rule: `backspace` removes the last character.

- 1 2 backspace equals | sends "1" -> 1 | expression "1", result "1", error null  # backspace clears the whole expression
- 2 add backspace | no request | expression "2", result null, error null  # backspace ignored on an operator
- 1 decimal 5 backspace decimal 2 equals | sends "1.2" -> 1.2 | expression "1.2", result "1.2", error null  # point state not updated after backspace, so the new point is refused

Rule: `√(` is removed as one.

- sqrt backspace | no request | expression "", result null, error null  # only the symbol or only the parenthesis removed

Rule: `backspace` on an empty expression does nothing.

- backspace | no request | expression "", result null, error null  # error or stray state on an empty expression

### Clear

Rule: `clear` empties the expression, the result and the error.

- 2 add 3 equals clear | no request | expression "", result null, error null  # result kept after clear
- 1 divide 0 equals clear | no request | expression "", result null, error null  # error kept after clear

### Equals on an empty expression

Rule: `equals` on an empty expression does nothing.

- equals | no request | expression "", result null, error null  # an empty request sent

### Equals closes every open parenthesis

Rule: `equals` closes every parenthesis still open, then sends the expression in one request.

- open_paren 2 add 3 equals | sends "(2+3)" -> 5 | expression "(2+3)", result "5", error null  # open parenthesis not closed on equals
- open_paren open_paren 2 add 3 equals | sends "((2+3))" -> 5 | expression "((2+3))", result "5", error null  # only one of two parentheses closed
- open_paren sqrt 4 equals | sends "(sqrt(4))" -> 2 | expression "(√(4))", result "2", error null  # square root not closed, or closed by the wrong character
- open_paren equals | sends "()" -> rejects "Invalid input" | expression "(", result null, error "Invalid input"  # empty group refused in the browser instead of sent

### Equals with no open parenthesis sends as typed

Rule: with no open parenthesis, `equals` sends the expression as typed.

- 2 add 3 equals | sends "2+3" -> 5 | expression "2+3", result "5", error null  # a closing parenthesis added with no open one

### The frontend does not police syntax

Rule: a sequence the backend will reject is still typed and still sent.

- 2 add equals | sends "2+" -> rejects "Invalid input" | expression "2+", result null, error "Invalid input"  # trailing operator refused in the browser
- 2 add add 3 equals | sends "2++3" -> rejects "Invalid input" | expression "2++3", result null, error "Invalid input"  # two operators in a row refused or merged
- close_paren 2 equals | sends ")2" -> rejects "Invalid input" | expression ")2", result null, error "Invalid input"  # closing parenthesis before any opening one refused
- 2 open_paren 3 close_paren equals | sends "2(3)" -> rejects "Invalid input" | expression "2(3)", result null, error "Invalid input"  # implied multiplication inserted or refused
- percentage equals | sends "%" -> rejects "Invalid input" | expression "%", result null, error "Invalid input"  # percent on an empty expression refused
- 1 multiply 1 0 0 0 ... (1,001 characters in total, for example 500 times "1+" followed by "1") equals | sends the same 1,001 characters | no error from the browser  # length limit enforced in the browser

### Every key after a result

Rule: after a result, a digit starts a new expression and the old result is no longer continued.

- 2 add 3 equals 7 | sends "2+3" -> 5 | expression "7", result null, error null  # digit appended to the old expression, or the old result kept
- 2 add 3 equals 0 7 | sends "2+3" -> 5 | expression "7", result null, error null  # zero prepended to the old result, giving "507" or "07"

Rule: after a result, `decimal`, `open_paren` and `sqrt` start a new expression.

- 2 add 3 equals decimal 5 | sends "2+3" -> 5 | expression "0.5", result null, error null  # decimal appended to the old expression
- 2 add 3 equals open_paren 7 equals | sends "2+3" -> 5, then "(7)" -> 7 | expression "(7)", result "7", error null  # open parenthesis appended to the old expression
- 2 add 3 equals sqrt 1 6 equals | sends "2+3" -> 5, then "sqrt(16)" -> 4 | expression "√(16)", result "4", error null  # square root appended to the old expression

Rule: after a result, `add`, `subtract`, `multiply`, `divide`, `power` and `percentage` continue from the result text.

- 2 add 3 equals add | no request | expression "5+", result null, error null  # old expression kept, or result not used
- 2 add 3 equals subtract | no request | expression "5-", result null, error null  # subtract not continuing the result
- 2 add 3 equals multiply | no request | expression "5×", result null, error null  # multiply not continuing the result
- 2 add 3 equals divide | no request | expression "5÷", result null, error null  # divide not continuing the result
- 2 add 3 equals power | no request | expression "5^", result null, error null  # power not continuing the result
- 2 add 3 equals percentage | no request | expression "5%", result null, error null  # percentage not continuing the result
- 2 add 3 equals multiply 4 equals | sends "5*4" -> 20 | expression "5×4", result "20", error null  # continuation built on the old expression "2+3×4"

Rule: after a result, `close_paren`, `backspace` and `equals` do nothing.

- 2 add 3 equals close_paren | no request | expression "2+3", result "5", error null  # closing parenthesis appended
- 2 add 3 equals backspace | no request | expression "2+3", result "5", error null  # last character removed from the old expression
- 2 add 3 equals equals | no request | expression "2+3", result "5", error null  # the same request sent again

### Negative results continued with each operator

Rule: a negative result is wrapped in parentheses when we continue from it.

- subtract 5 equals | sends "-5" -> -5 | expression "-5", result "-5", error null  # result shown with a Unicode minus
- subtract 5 equals add | no request | expression "(-5)+", result null, error null  # wrap missing
- subtract 5 equals subtract | no request | expression "(-5)-", result null, error null  # wrap missing
- subtract 5 equals multiply | no request | expression "(-5)×", result null, error null  # wrap missing
- subtract 5 equals divide | no request | expression "(-5)÷", result null, error null  # wrap missing
- subtract 5 equals power | no request | expression "(-5)^", result null, error null  # wrap missing
- subtract 5 equals percentage | no request | expression "(-5)%", result null, error null  # wrap missing
- subtract 5 equals power 2 equals | sends "(-5)^2" -> 25 | expression "(-5)^2", result "25", error null  # wrap missing, so the request is "-5^2" and the answer is -25

### Results in exponent form

Rule: the result is the number as JavaScript prints it, `String(result)`.

- 1 divide 1 0 0 0 0 0 0 0 equals | sends "1/10000000" -> 1e-7 | expression "1÷10000000", result "1e-7", error null  # printed as 0.0000001
- 1 0 power 2 1 equals | sends "10^21" -> 1e21 | expression "10^21", result "1e+21", error null  # printed as a long integer
- 1 0 power 2 1 equals 3 | sends "10^21" -> 1e21 | expression "3", result null, error null  # digit appended to "1e+21", giving "1e+213"
- 1 divide 1 0 0 0 0 0 0 0 equals add 3 equals | sends "1e-7+3" -> 3.0000001 | expression "1e-7+3", result "3.0000001", error null  # exponent text rewritten before it is sent
- subtract 1 divide 1 0 0 0 0 0 0 0 equals power | no request | expression "(-1e-7)^", result null, error null  # negative exponent-form result not wrapped

### While a request is pending, every key is ignored

Rule: while a request is pending, every key press is ignored.

- 2 add 3 equals 4 | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"  # digit typed into the expression while waiting
- 2 add 3 equals clear | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"  # clear cancels the request
- 2 add 3 equals equals | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"  # second request sent while waiting
- 2 add 3 equals 4 | sends "2+3" -> 5 | expression "2+3", result "5", error null  # key pressed while waiting applied after the answer
- 2 add 3 equals, answer 5, then 4 | sends "2+3" -> 5 | expression "4", result null, error null  # keys still ignored after the answer, so the state never unlocks

### Errors: the expression is kept as typed

Rule: when a request fails, `error` is set and the expression stays as typed, without the parentheses equals would have closed.

- 1 divide 0 equals | sends "1/0" -> rejects "Cannot divide by zero" | expression "1÷0", result null, error "Cannot divide by zero"  # expression cleared or result set on error
- open_paren 2 add equals | sends "(2+)" -> rejects "Invalid input" | expression "(2+", result null, error "Invalid input"  # closing parenthesis kept in the expression
- 1 multiply sqrt subtract 1 equals | sends "1*sqrt(-1)" -> rejects "Invalid input" | expression "1×√(-1", result null, error "Invalid input"  # kept expression stored in its sent form
- 2 add 3 equals add equals | sends "5+" -> rejects "Invalid input" | expression "5+", result null, error "Invalid input"  # old result still set next to the error

### Errors: recovery with another key

Rule: the next key press clears the error and is then applied to the kept expression.

- 1 divide 0 equals 3 | no request | expression "1÷3", result null, error null  # digit starts a new expression, or appended to "1÷0" giving "1÷03"
- 2 add equals backspace | sends "2+" -> rejects "Invalid input" | expression "2", result null, error null  # backspace ignored while the error is set

Rule: `equals` after an error clears the error and sends the kept expression again.

- 1 divide 0 equals equals | sends "1/0" twice, each -> rejects "Cannot divide by zero" | expression "1÷0", result null, error "Cannot divide by zero"  # second equals does nothing, or the error is kept without a new request

## 2. API client

### Request shape

Rule: `calculate` sends a `POST` to the base URL plus `/calculations`, with `Content-Type: application/json` and the body `{ "expression": ... }`.

- calculate("2 + 3 * 4") with the default base | fake fetch sees POST "/api/v1/calculations", Content-Type application/json, body {"expression":"2 + 3 * 4"} | resolves 14  # body altered (spaces removed or the expression rewritten), or wrong method or header
- calculate("2+3") with VITE_API_BASE_URL "https://api.example.test/api/v1" | fake fetch sees POST "https://api.example.test/api/v1/calculations" | resolves 5  # base URL ignored and the default used

### Success

Rule: a `200` resolves with `result`.

- 200 {"result":14} | resolves 14 (a number) | # a string or the whole object resolved
- 200 {"result":0} | resolves 0 | # zero treated as a missing value and rejected

### Documented errors

Rule: an error response in the documented shape rejects with an `ApiError` carrying its `code`, its `message` and its status.

- 400 {"error":{"code":"invalid_request","message":"..."}} | rejects ApiError code "invalid_request", status 400, with the message | # status or code taken from the wrong place
- 404 {"error":{"code":"not_found","message":"..."}} | rejects ApiError code "not_found", status 404 | # status hard-coded
- 405 {"error":{"code":"method_not_allowed","message":"..."}} with an Allow header | rejects ApiError code "method_not_allowed", status 405 | # status hard-coded
- 415 {"error":{"code":"unsupported_media_type","message":"..."}} | rejects ApiError code "unsupported_media_type", status 415 | # status hard-coded
- 422 {"error":{"code":"invalid_expression","message":"..."}} | rejects ApiError code "invalid_expression", status 422 | # 422 evaluation codes and the syntax code mapped to each other
- 422 {"error":{"code":"division_by_zero","message":"cannot divide by zero"}} | rejects ApiError code "division_by_zero", status 422 | # code replaced by a generic one
- 422 {"error":{"code":"negative_square_root","message":"..."}} | rejects ApiError code "negative_square_root", status 422 | # code replaced by a generic one
- 422 {"error":{"code":"undefined_result","message":"..."}} | rejects ApiError code "undefined_result", status 422 | # code replaced by a generic one
- 422 {"error":{"code":"result_out_of_range","message":"..."}} | rejects ApiError code "result_out_of_range", status 422 | # code replaced by a generic one
- 500 {"error":{"code":"internal_error","message":"..."}} | rejects ApiError code "internal_error", status 500 | # status or code hard-coded

### Failed fetch

Rule: a failed `fetch` rejects with code `network_error` and status `0`.

- fake fetch rejects with TypeError("Failed to fetch") | rejects ApiError code "network_error", status 0 | # raw TypeError leaked to the caller

### Responses that are not JSON

Rule: any other response rejects with code `invalid_response`.

- 502 with Content-Type text/html and body "<html>Bad Gateway</html>" | rejects ApiError code "invalid_response", status 502 | # JSON SyntaxError leaked to the caller
- 200 with Content-Type text/plain and body "OK" | rejects ApiError code "invalid_response" | # any 200 treated as a success before parsing

### JSON in the wrong shape

Rule: a 200 without a numeric `result` is not a success, so it rejects with `invalid_response`.

- 200 {} | rejects ApiError code "invalid_response" | # undefined resolved as the result
- 200 {"result":"14"} | rejects ApiError code "invalid_response" | # string accepted as a number
- 200 null | rejects ApiError code "invalid_response" | # TypeError on reading a field of null
- 422 {"error":"division by zero"} | rejects ApiError code "invalid_response" | # error string accepted, giving an ApiError with no code

## 3. Hook

The hook is tested with `calculate` replaced by a fake. The fake records each call and answers as stated.

### The request is made from the key press, once per request

Rule: the hook calls `calculate` once, with `request.expression`, when a key press produces a request.

- 2 add 3 equals; fake answers later with 5 (still pending) | calculate called once with "2+3" | expression "2+3", result null, error null, busy true  # calculate not called, or called with the shown form
- 2 add 3 equals; fake answers 5 | calculate called once with "2+3" | expression "2+3", result "5", error null, busy false  # busy stuck true after the answer
- open_paren 2 add 3 equals; fake answers 5 | calculate called once with "(2+3)" | expression "(2+3)", result "5", error null, busy false  # hook uses the typed text instead of the request
- 2 add 3 equals; fake answers later with 5 (still pending), then 4 and equals pressed | calculate called once in total | expression "2+3", result null, error null, busy true  # key presses during the wait reach calculate
- 2 add 3; no equals | calculate never called | expression "2+3", result null, error null, busy false  # request made on every key press
- equals on an empty expression | calculate never called | expression "", result null, error null, busy false  # call made with an empty string

Rule: the call starts from the key-press handler, not from an effect.

- 2 add 3 equals, checked straight after `press` returns, before any effect is flushed | calculate has already been called once | busy true  # call moved into an effect, so it runs after render

### Result

Rule: on success, `result` is `String(result)`, and the state is no longer busy.

- 2 subtract 2 equals; fake answers 0 | expression "2-2", result "0", error null, busy false  # zero treated as a failure by a falsy check

### Errors: display text

Rule: the hook maps the code of the error to the display text. The message of the API is never shown.

- 1 divide 0 equals; fake rejects ApiError code "division_by_zero" with message "boom" | expression "1÷0", result null, error "Cannot divide by zero", busy false  # API message shown, or busy stuck true, or the rejection unhandled
- 2 add 3 equals; fake rejects ApiError code "network_error", status 0 | expression "2+3", result null, error "No connection", busy false  # network error shown as "Error"
- sqrt subtract 1 equals; fake rejects ApiError code "negative_square_root" | calculate called with "sqrt(-1)", error "Invalid input" | # mapping missing for this code
- open_paren subtract 8 close_paren power decimal 5 equals; fake rejects ApiError code "undefined_result" | calculate called with "(-8)^0.5", error "Invalid input" | # mapping missing for this code
- 1 0 power 4 0 0 equals; fake rejects ApiError code "result_out_of_range" | calculate called with "10^400", error "Overflow" | # mapping missing for this code
- 2 add 3 equals; fake rejects ApiError code "invalid_expression" | error "Invalid input" | # mapping missing for this code
- 2 add 3 equals; fake rejects ApiError code "internal_error" | error "Error" | # internal error shown with a raw code
- 2 add 3 equals; fake rejects ApiError code "invalid_response" | error "Error" | # invalid response shown with a raw code
- 2 add 3 equals; fake rejects with a plain Error("x") (not ApiError) | error "Error" | # the hook crashes on a value that is not an ApiError

### Errors: the expression is kept, and the next press is applied

Rule: after a failure, the expression is kept and the next key is applied to it.

- 1 divide 0 equals equals; fake rejects both times | calculate called twice, both with "1/0" | expression "1÷0", result null, error "Cannot divide by zero", busy false  # second press ignored, or the hook caches the failed request

### After an answer

Rule: keys work again once the answer has arrived.

- 2 add 3 equals; fake answers 5; then 7 | calculate called once with "2+3" | expression "7", result null, error null, busy false  # busy or request still set after the answer, so the key is ignored

## 4. Components

Components are tested through `<App />`, with `src/api/client.ts` replaced by `vi.mock` as in the hook part. Buttons are found by role and accessible name, and keys are typed with `user-event`. "Display" is the region named "Display". "Status" is the element with role `status`.

The reducer and hook parts already cover behaviour. These cases cover wiring, rendering, the keyboard and accessibility.

Notation: `click A B` clicks the buttons named A, then B. `type "..."` types on the physical keyboard, in `user-event` syntax. `fake answers N`, `fake rejects <code>` and `fake pending` (never answers) say how the fake `calculate` behaves.

### The screen

Rule: one level-1 heading "Calculator", and a group "Keypad" holding the 23 keys in keypad order.

- no keys | heading "Calculator"; group "Keypad" holds exactly these buttons, in order: Clear, Open parenthesis, Close parenthesis, Backspace, Square root, Power, Percent, Divide, 7, 8, 9, Multiply, 4, 5, 6, Minus, 1, 2, 3, Plus, 0, Decimal point, Equals  # a key missing, renamed, or out of keypad order

### The display

Rule: an empty expression shows 0.

- no keys | display shows "0"; status empty  # empty display left blank, or the placeholder announced

Rule: after a result, the display shows the sent expression and the result, and the status announces it.

- click 2 Plus 3 Equals; fake answers 5 | calculate called once with "2+3"; display shows "2+3" and "5"; status "Equals 5"  # equals button wired wrong, result not rendered, or not announced

Rule: after an error, the display shows the kept expression and the error text, and the status announces the error.

- click 1 Divide 0 Equals; fake rejects division_by_zero | display shows "1÷0" and "Cannot divide by zero"; status "Cannot divide by zero"  # error hidden, expression dropped, or the error not announced

Rule: the next key after an error removes the error from the screen.

- click 1 Divide 0 Equals; fake rejects division_by_zero; click 2 | display shows "1÷2" and no error text; status empty  # error text left on screen after the state cleared it

Rule: while a request is pending, the display is busy.

- click 2 Plus 3 Equals; fake pending | display has aria-busy "true"  # waiting state hidden from assistive technology
- click 2 Plus 3 Equals; fake answers 5 | display has aria-busy "false"  # busy left on after the answer

Rule: the display shows the state's text unchanged; styling never replaces a character.

- click 2 Power 3 | display shows "2^3"  # caret dropped or replaced while raising it
- click 2 Minus 9 Equals; fake answers -7 | display shows "-7"; status "Equals -7"  # sign dropped or replaced (for example by "−") while styling it

### Clicking keys

Rule: each button presses its key.

- click 1 2 3 4 5 6 7 8 9 0 | display shows "1234567890"  # a digit button wired to the wrong key
- click 1 "Decimal point" 5 | display shows "1.5"  # decimal button wired wrong
- click 2 Plus 3 Minus 4 Multiply 5 Divide 6 Power 2 Percent | display shows "2+3-4×5÷6^2%"  # an operator button wired to the wrong key
- click "Open parenthesis" "Square root" 9 "Close parenthesis" "Close parenthesis" | display shows "(√(9))"  # a parenthesis or square-root button wired wrong
- click 1 2 Backspace | display shows "1"  # backspace button wired wrong
- click 1 2 Clear | display shows "0"  # clear button wired wrong

### Typing on the keyboard

Rule: the physical keys in the map press their calculator key.

- type "1234567890" | display shows "1234567890"  # digit keys not mapped
- type "1.5+2,5" | display shows "1.5+2.5"  # "." or "," not mapped to the decimal point
- type "2+3-4*5/6^2%" | display shows "2+3-4×5÷6^2%"  # an operator key not mapped
- type "2x3X4" | display shows "2×3×4"  # x or X not accepted for multiply
- type "r9)R4" | display shows "√(9)√(4"  # r or R not mapped to the square root
- type "(1)" | display shows "(1)"  # parenthesis keys not mapped
- type "12{Backspace}" | display shows "1"  # Backspace not mapped
- type "12{Escape}" | display shows "0"  # Escape not mapped to clear
- type "12{Delete}" | display shows "0"  # Delete not mapped to clear
- type "2+3{Enter}"; fake answers 5 | calculate called once with "2+3"; display shows "5"  # Enter not mapped to equals
- type "2+3="; fake answers 5 | calculate called once with "2+3"  # "=" not mapped to equals

Rule: presses with Ctrl, Cmd or Alt held press nothing.

- type "{Control>}r{/Control}{Meta>}r{/Meta}{Alt>}r{/Alt}" | display shows "0"  # browser shortcuts such as reload typed into the expression

Rule: keys outside the map do nothing.

- type "a" | display shows "0"  # every typed character added to the expression

Rule: Enter always means equals, even when a key button has focus.

- click 7 (focus stays on it); type "{Enter}"; fake answers 7 | calculate called once with "7"; display never shows "77"  # Enter also clicks the focused button and types the key again

Rule: Space presses the focused key.

- focus the 7 button; type " " | display shows "7"  # the keyboard handler swallows Space, so a focused key can't be pressed

### Focus

Rule: focus moves through the keys in keypad order.

- press Tab twice from the start of the page | focus on Clear, then on "Open parenthesis"  # tab order does not follow the keypad

## Questions and open points

Rules I could not turn into a case, or that are ambiguous. Each has the question I would ask.

- The expression while a request is pending. I assumed the typed text stays visible and the closed-parentheses form lives only in `request`. Question: is that right, or should the shown expression show the closed form already while waiting?
- The 15-digit limit. I assumed it counts every digit in the number, including a leading `0` before the point, and not the point itself. The case "1.12345678901234" depends on this. Question: is that the intended count?
- A digit after 15 digits when a decimal point is still to come. Typing a point after 15 digits is not a digit, so I assumed it is accepted. Question: is a point allowed once the number is full?
- Result texts can have more than 15 digits, for example "1234567890123460" (API example) or "0.000000123456789012345". Question: do these count against the limit when they are in the expression? I assumed the result text is never edited, so the limit does not apply to it.
- Pending requests have no timeout and no way out. `clear` is ignored while waiting, as the spec says. Question: is a request that never answers acceptable, or should the spec give a cancel or timeout?
- Negative-result wrapping. I wrote a case for each operator, assuming the wrap applies to all of them and not only to `power`, and that the sent form keeps the parentheses. Question: is that the intent?
- A digit after a result clears the result. I assumed `result` becomes null when a new expression starts. Question: confirm.
- `equals` after an error. I assumed it clears the error and sends the kept expression again, as the "next key press" rule says. Question: confirm.
- Client: a 200 without a numeric `result`, a documented error with no `code` or no `message`, or non-string values. I assumed `invalid_response` in each case. Question: confirm, and say what `status` is for `invalid_response`: the HTTP status (for example 502) or 0. The spec only defines 0 for "no response".
- Client: a trailing slash in `VITE_API_BASE_URL`. Question: should the client join base and path without doubling the slash?
- Client: retries. The spec says nothing, so I assumed no retry. Question: confirm.
- Hook: where the mapping from code to display text lives. I assumed the hook, because the spec says `rejected` carries the display text. A plain `Error` (not `ApiError`) I assumed maps to "Error". Question: confirm.
- Expression length. The API limits expressions to 1,000 characters and the spec says nothing about a limit in the browser. I assumed the browser does not limit it. Question: confirm.
- Enter with a key focused. I assumed Enter always means equals, as in desktop calculators, so clicking a key and then pressing Enter doesn't type that key again. The cost is that Enter can't activate a focused key; Space still does. Question: confirm.
- Square root on the keyboard. I assumed `r` (for root). Question: confirm, or choose another key.
- Delete. I assumed Delete clears everything, but on Windows keyboards Delete is the forward-delete key, and users may expect it to delete one character. Question: confirm.
- The minus sign of a negative result. The display shows the spec's `-` from `String(result)`, styled wider. Question: may it show a true minus sign, "−" (U+2212), instead? The negative-sign case changes if so.
- Keys while waiting. Presses are ignored silently and the keys look the same. Question: should they look disabled, and be `aria-disabled`, while a request is pending?
- The legend is written by hand, separately from the key map, so the two can drift apart. Question: should a case check that every key the legend names presses the action it names?
- `src/App.test.tsx` ("renders the app heading") checks the same heading as the screen case. Question: keep it, or let the new case replace it?
- The components already exist, so these tests will pass on their first run. QA's "done" condition (every new test fails because the code is not implemented) can't be met. Question: what does "done" mean for this pass?

Rules with no case, and why:

- Principle, Layers and Public surface: statements and type names, checked by the compiler, not by behaviour tests.
- Components cannot import `src/api` or call `fetch`: enforced by the linter, not a behaviour case.
- Coverage of 90%: CI setting, not a case.
- Not in scope (history, memory keys, sign-change key): no case. The "2×-3" case covers the missing sign-change key.
- Hook rule 1 ("`press` is the only way in"): covered only indirectly, because every hook case goes through `press`.
- Sizes, the lit key, the legend's visibility, contrast (accessibility rule 6), reduced motion (rule 7) and forced colours (rule 8) all depend on CSS media and layout, which jsdom doesn't compute. They are checked by eye and recorded in `DESIGN.md`.
- Display rule 5 (a long line scrolls to its end) needs real layout: jsdom reports every scroll width as 0.
- Keyboard rule 7 (the legend) is content shown or hidden by CSS. See the legend question above.

Places where the two documents disagree:

- No direct contradiction found. The two documents agree on the codes, statuses and sent forms.
- Friction: the spec's 15-digit limit counts digits, while `api.md` rounds results to 15 significant digits and shows results with 16 digits (`1234567890123460`) and with many leading zeros. A result text can therefore have more digits than a typed number may have. The spec does not say whether that matters, because result text is never edited.
- Friction: `api.md` says `message` can change and clients should rely on `code`. The spec agrees, but says `rejected` carries display text, so the message never reaches the screen. That is consistent, but it means the code-to-text mapping must sit in exactly one place. The spec does not say which place.
