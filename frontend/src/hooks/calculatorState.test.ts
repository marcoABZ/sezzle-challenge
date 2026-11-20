import { describe, expect, it } from 'vitest'
import { initialState, reduce } from './calculatorState.ts'
import type { Key, State } from './calculatorState.ts'

// An answer from the API to the request the state is waiting on. `sends` is
// the request the case expects at that point. A case that doesn't state it
// only needs the answer to get where it is going.
type Answer = { sends?: string } & ({ resolves: number } | { rejects: string })

// A string is a run of keys separated by spaces, as written in TEST_CASES.md.
type Step = string | Answer

type Expected = Partial<Pick<State, 'expression' | 'result' | 'error' | 'request'>>

type Row = [name: string, steps: Step[], expected: Expected]

const KEYS: readonly Key[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'decimal',
  'add', 'subtract', 'multiply', 'divide', 'power', 'percentage',
  'sqrt', 'open_paren', 'close_paren',
  'clear', 'backspace', 'equals',
]

function isKey(word: string): word is Key {
  return KEYS.some((key) => key === word)
}

function keys(text: string): Key[] {
  return text.split(' ').map((word) => {
    if (!isKey(word)) throw new Error(`not a key: "${word}"`)
    return word
  })
}

function answer(state: State, step: Answer): State {
  expect(state.request, 'a request waiting for this answer').not.toBeNull()
  if (step.sends !== undefined) {
    expect(state.request?.expression, 'the request sent').toBe(step.sends)
  }
  if ('resolves' in step) return reduce(state, { type: 'resolved', result: step.resolves })
  return reduce(state, { type: 'rejected', message: step.rejects })
}

function run(steps: Step[]): State {
  let state = initialState
  for (const step of steps) {
    if (typeof step === 'string') {
      for (const key of keys(step)) state = reduce(state, { type: 'key', key })
    } else {
      state = answer(state, step)
    }
  }
  return state
}

function check(_name: string, steps: Step[], expected: Expected) {
  expect(run(steps)).toMatchObject(expected)
}

describe('Initial state', () => {
  // Rule: the expression starts empty, with no result, no error and no request.
  it.each<Row>([
    [
      'no keys | no request | expression "", result null, error null',
      [],
      { expression: '', result: null, error: null, request: null },
    ],
  ])('%s', check)
})

describe('Each key: shown form and sent form', () => {
  // Rule: each key appends its shown form to the expression; the request
  // carries its sent form.
  it.each<Row>([
    [
      '1 2 3 4 5 6 7 8 9 0 equals | sends "1234567890" -> 1234567890 | expression "1234567890", result "1234567890", error null',
      ['1 2 3 4 5 6 7 8 9 0 equals', { sends: '1234567890', resolves: 1234567890 }],
      { expression: '1234567890', result: '1234567890', error: null },
    ],
    [
      '1 decimal 5 equals | sends "1.5" -> 1.5 | expression "1.5", result "1.5", error null',
      ['1 decimal 5 equals', { sends: '1.5', resolves: 1.5 }],
      { expression: '1.5', result: '1.5', error: null },
    ],
    [
      '2 add 3 equals | sends "2+3" -> 5 | expression "2+3", result "5", error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }],
      { expression: '2+3', result: '5', error: null },
    ],
    [
      '9 subtract 4 equals | sends "9-4" -> 5 | expression "9-4", result "5", error null',
      ['9 subtract 4 equals', { sends: '9-4', resolves: 5 }],
      { expression: '9-4', result: '5', error: null },
    ],
    [
      '2 multiply 3 equals | sends "2*3" -> 6 | expression "2×3", result "6", error null',
      ['2 multiply 3 equals', { sends: '2*3', resolves: 6 }],
      { expression: '2×3', result: '6', error: null },
    ],
    [
      '8 divide 2 equals | sends "8/2" -> 4 | expression "8÷2", result "4", error null',
      ['8 divide 2 equals', { sends: '8/2', resolves: 4 }],
      { expression: '8÷2', result: '4', error: null },
    ],
    [
      '2 power 3 equals | sends "2^3" -> 8 | expression "2^3", result "8", error null',
      ['2 power 3 equals', { sends: '2^3', resolves: 8 }],
      { expression: '2^3', result: '8', error: null },
    ],
    [
      '2 0 0 multiply 1 5 percentage equals | sends "200*15%" -> 30 | expression "200×15%", result "30", error null',
      ['2 0 0 multiply 1 5 percentage equals', { sends: '200*15%', resolves: 30 }],
      { expression: '200×15%', result: '30', error: null },
    ],
    [
      'sqrt 1 6 equals | sends "sqrt(16)" -> 4 | expression "√(16)", result "4", error null',
      ['sqrt 1 6 equals', { sends: 'sqrt(16)', resolves: 4 }],
      { expression: '√(16)', result: '4', error: null },
    ],
    [
      'open_paren 2 add 3 close_paren multiply 4 equals | sends "(2+3)*4" -> 20 | expression "(2+3)×4", result "20", error null',
      ['open_paren 2 add 3 close_paren multiply 4 equals', { sends: '(2+3)*4', resolves: 20 }],
      { expression: '(2+3)×4', result: '20', error: null },
    ],
    [
      'subtract 3 equals | sends "-3" -> -3 | expression "-3", result "-3", error null',
      ['subtract 3 equals', { sends: '-3', resolves: -3 }],
      { expression: '-3', result: '-3', error: null },
    ],
    [
      '2 multiply subtract 3 equals | sends "2*-3" -> -6 | expression "2×-3", result "-6", error null',
      ['2 multiply subtract 3 equals', { sends: '2*-3', resolves: -6 }],
      { expression: '2×-3', result: '-6', error: null },
    ],
  ])('%s', check)
})

describe('decimal where no number is being typed enters 0.', () => {
  // Rule: `decimal` where no number is being typed enters `0.`.
  it.each<Row>([
    [
      'decimal 5 equals | sends "0.5" -> 0.5 | expression "0.5", result "0.5", error null',
      ['decimal 5 equals', { sends: '0.5', resolves: 0.5 }],
      { expression: '0.5', result: '0.5', error: null },
    ],
    [
      '2 add decimal 5 equals | sends "2+0.5" -> 2.5 | expression "2+0.5", result "2.5", error null',
      ['2 add decimal 5 equals', { sends: '2+0.5', resolves: 2.5 }],
      { expression: '2+0.5', result: '2.5', error: null },
    ],
    [
      'open_paren decimal 5 close_paren equals | sends "(0.5)" -> 0.5 | expression "(0.5)", result "0.5", error null',
      ['open_paren decimal 5 close_paren equals', { sends: '(0.5)', resolves: 0.5 }],
      { expression: '(0.5)', result: '0.5', error: null },
    ],
  ])('%s', check)
})

describe('A second decimal point in the same number is ignored', () => {
  // Rule: a second decimal point in the same number is ignored.
  it.each<Row>([
    [
      '1 decimal 5 decimal 2 equals | sends "1.52" -> 1.52 | expression "1.52", result "1.52", error null',
      ['1 decimal 5 decimal 2 equals', { sends: '1.52', resolves: 1.52 }],
      { expression: '1.52', result: '1.52', error: null },
    ],
    [
      '1 decimal decimal 5 equals | sends "1.5" -> 1.5 | expression "1.5", result "1.5", error null',
      ['1 decimal decimal 5 equals', { sends: '1.5', resolves: 1.5 }],
      { expression: '1.5', result: '1.5', error: null },
    ],
    [
      '1 decimal 5 add 2 decimal 5 equals | sends "1.5+2.5" -> 4 | expression "1.5+2.5", result "4", error null',
      ['1 decimal 5 add 2 decimal 5 equals', { sends: '1.5+2.5', resolves: 4 }],
      { expression: '1.5+2.5', result: '4', error: null },
    ],
  ])('%s', check)
})

describe('A number has at most 15 digits; extra digits are ignored', () => {
  // Rule: a number takes at most 15 digits; a digit typed after that is ignored.
  it.each<Row>([
    [
      '1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "123456789012345" -> 123456789012345 | expression "123456789012345", result "123456789012345", error null',
      ['1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals', { sends: '123456789012345', resolves: 123456789012345 }],
      { expression: '123456789012345', result: '123456789012345', error: null },
    ],
    [
      '1 decimal 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "1.12345678901234" -> 1.12345678901234 | expression "1.12345678901234", result "1.12345678901234", error null',
      ['1 decimal 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals', { sends: '1.12345678901234', resolves: 1.12345678901234 }],
      { expression: '1.12345678901234', result: '1.12345678901234', error: null },
    ],
    [
      '2 add 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals | sends "2+123456789012345" -> 123456789012347 | expression "2+123456789012345", result "123456789012347", error null',
      ['2 add 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 equals', { sends: '2+123456789012345', resolves: 123456789012347 }],
      { expression: '2+123456789012345', result: '123456789012347', error: null },
    ],
    [
      '1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 backspace 9 equals | sends "123456789012349" -> 123456789012349 | expression "123456789012349", result "123456789012349", error null',
      ['1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 backspace 9 equals', { sends: '123456789012349', resolves: 123456789012349 }],
      { expression: '123456789012349', result: '123456789012349', error: null },
    ],
  ])('%s', check)
})

describe('Zero followed by a digit: the zero is replaced', () => {
  // Rule: a number that is just `0` is replaced by the next digit.
  it.each<Row>([
    [
      '0 7 equals | sends "7" -> 7 | expression "7", result "7", error null',
      ['0 7 equals', { sends: '7', resolves: 7 }],
      { expression: '7', result: '7', error: null },
    ],
    [
      '2 add 0 7 equals | sends "2+7" -> 9 | expression "2+7", result "9", error null',
      ['2 add 0 7 equals', { sends: '2+7', resolves: 9 }],
      { expression: '2+7', result: '9', error: null },
    ],
    [
      '0 decimal 0 7 equals | sends "0.07" -> 0.07 | expression "0.07", result "0.07", error null',
      ['0 decimal 0 7 equals', { sends: '0.07', resolves: 0.07 }],
      { expression: '0.07', result: '0.07', error: null },
    ],
  ])('%s', check)
})

describe('Backspace', () => {
  // Rule: `backspace` removes the last character.
  it.each<Row>([
    [
      '1 2 backspace equals | sends "1" -> 1 | expression "1", result "1", error null',
      ['1 2 backspace equals', { sends: '1', resolves: 1 }],
      { expression: '1', result: '1', error: null },
    ],
    [
      '2 add backspace | no request | expression "2", result null, error null',
      ['2 add backspace'],
      { expression: '2', result: null, error: null, request: null },
    ],
    [
      '1 decimal 5 backspace decimal 2 equals | sends "1.2" -> 1.2 | expression "1.2", result "1.2", error null',
      ['1 decimal 5 backspace decimal 2 equals', { sends: '1.2', resolves: 1.2 }],
      { expression: '1.2', result: '1.2', error: null },
    ],
  ])('%s', check)

  // Rule: `√(` is removed as one.
  it.each<Row>([
    [
      'sqrt backspace | no request | expression "", result null, error null',
      ['sqrt backspace'],
      { expression: '', result: null, error: null, request: null },
    ],
  ])('%s', check)

  // Rule: `backspace` on an empty expression does nothing.
  it.each<Row>([
    [
      'backspace | no request | expression "", result null, error null',
      ['backspace'],
      { expression: '', result: null, error: null, request: null },
    ],
  ])('%s', check)
})

describe('Clear', () => {
  // Rule: `clear` empties the expression, the result and the error.
  it.each<Row>([
    [
      '2 add 3 equals clear | no request | expression "", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'clear'],
      { expression: '', result: null, error: null, request: null },
    ],
    [
      '1 divide 0 equals clear | no request | expression "", result null, error null',
      ['1 divide 0 equals', { rejects: 'Cannot divide by zero' }, 'clear'],
      { expression: '', result: null, error: null, request: null },
    ],
  ])('%s', check)
})

describe('Equals on an empty expression', () => {
  // Rule: `equals` on an empty expression does nothing.
  it.each<Row>([
    [
      'equals | no request | expression "", result null, error null',
      ['equals'],
      { expression: '', result: null, error: null, request: null },
    ],
  ])('%s', check)
})

describe('Equals closes every open parenthesis', () => {
  // Rule: `equals` closes every parenthesis still open, then sends the
  // expression in one request.
  it.each<Row>([
    [
      'open_paren 2 add 3 equals | sends "(2+3)" -> 5 | expression "(2+3)", result "5", error null',
      ['open_paren 2 add 3 equals', { sends: '(2+3)', resolves: 5 }],
      { expression: '(2+3)', result: '5', error: null },
    ],
    [
      'open_paren open_paren 2 add 3 equals | sends "((2+3))" -> 5 | expression "((2+3))", result "5", error null',
      ['open_paren open_paren 2 add 3 equals', { sends: '((2+3))', resolves: 5 }],
      { expression: '((2+3))', result: '5', error: null },
    ],
    [
      'open_paren sqrt 4 equals | sends "(sqrt(4))" -> 2 | expression "(√(4))", result "2", error null',
      ['open_paren sqrt 4 equals', { sends: '(sqrt(4))', resolves: 2 }],
      { expression: '(√(4))', result: '2', error: null },
    ],
    [
      'open_paren equals | sends "()" -> rejects "Invalid input" | expression "(", result null, error "Invalid input"',
      ['open_paren equals', { sends: '()', rejects: 'Invalid input' }],
      { expression: '(', result: null, error: 'Invalid input' },
    ],
  ])('%s', check)
})

describe('Equals with no open parenthesis sends as typed', () => {
  // Rule: with no open parenthesis, `equals` sends the expression as typed.
  it.each<Row>([
    [
      '2 add 3 equals | sends "2+3" -> 5 | expression "2+3", result "5", error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }],
      { expression: '2+3', result: '5', error: null },
    ],
  ])('%s', check)
})

describe('The frontend does not police syntax', () => {
  // Rule: a sequence the backend will reject is still typed and still sent.
  it.each<Row>([
    [
      '2 add equals | sends "2+" -> rejects "Invalid input" | expression "2+", result null, error "Invalid input"',
      ['2 add equals', { sends: '2+', rejects: 'Invalid input' }],
      { expression: '2+', result: null, error: 'Invalid input' },
    ],
    [
      '2 add add 3 equals | sends "2++3" -> rejects "Invalid input" | expression "2++3", result null, error "Invalid input"',
      ['2 add add 3 equals', { sends: '2++3', rejects: 'Invalid input' }],
      { expression: '2++3', result: null, error: 'Invalid input' },
    ],
    [
      'close_paren 2 equals | sends ")2" -> rejects "Invalid input" | expression ")2", result null, error "Invalid input"',
      ['close_paren 2 equals', { sends: ')2', rejects: 'Invalid input' }],
      { expression: ')2', result: null, error: 'Invalid input' },
    ],
    [
      '2 open_paren 3 close_paren equals | sends "2(3)" -> rejects "Invalid input" | expression "2(3)", result null, error "Invalid input"',
      ['2 open_paren 3 close_paren equals', { sends: '2(3)', rejects: 'Invalid input' }],
      { expression: '2(3)', result: null, error: 'Invalid input' },
    ],
    [
      'percentage equals | sends "%" -> rejects "Invalid input" | expression "%", result null, error "Invalid input"',
      ['percentage equals', { sends: '%', rejects: 'Invalid input' }],
      { expression: '%', result: null, error: 'Invalid input' },
    ],
    [
      '1 multiply 1 0 0 0 ... (1,001 characters in total, for example 500 times "1+" followed by "1") equals | sends the same 1,001 characters | no error from the browser',
      [`${'1 add '.repeat(500)}1 equals`],
      { error: null, request: { expression: `${'1+'.repeat(500)}1` } },
    ],
  ])('%s', check)
})

describe('Every key after a result', () => {
  // Rule: after a result, a digit starts a new expression and the old result
  // is no longer continued.
  it.each<Row>([
    [
      '2 add 3 equals 7 | sends "2+3" -> 5 | expression "7", result null, error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, '7'],
      { expression: '7', result: null, error: null },
    ],
    [
      '2 add 3 equals 0 7 | sends "2+3" -> 5 | expression "7", result null, error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, '0 7'],
      { expression: '7', result: null, error: null },
    ],
  ])('%s', check)

  // Rule: after a result, `decimal`, `open_paren` and `sqrt` start a new
  // expression.
  it.each<Row>([
    [
      '2 add 3 equals decimal 5 | sends "2+3" -> 5 | expression "0.5", result null, error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, 'decimal 5'],
      { expression: '0.5', result: null, error: null },
    ],
    [
      '2 add 3 equals open_paren 7 equals | sends "2+3" -> 5, then "(7)" -> 7 | expression "(7)", result "7", error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, 'open_paren 7 equals', { sends: '(7)', resolves: 7 }],
      { expression: '(7)', result: '7', error: null },
    ],
    [
      '2 add 3 equals sqrt 1 6 equals | sends "2+3" -> 5, then "sqrt(16)" -> 4 | expression "√(16)", result "4", error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, 'sqrt 1 6 equals', { sends: 'sqrt(16)', resolves: 4 }],
      { expression: '√(16)', result: '4', error: null },
    ],
  ])('%s', check)

  // Rule: after a result, `add`, `subtract`, `multiply`, `divide`, `power` and
  // `percentage` continue from the result text.
  it.each<Row>([
    [
      '2 add 3 equals add | no request | expression "5+", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'add'],
      { expression: '5+', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals subtract | no request | expression "5-", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'subtract'],
      { expression: '5-', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals multiply | no request | expression "5×", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'multiply'],
      { expression: '5×', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals divide | no request | expression "5÷", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'divide'],
      { expression: '5÷', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals power | no request | expression "5^", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'power'],
      { expression: '5^', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals percentage | no request | expression "5%", result null, error null',
      ['2 add 3 equals', { resolves: 5 }, 'percentage'],
      { expression: '5%', result: null, error: null, request: null },
    ],
    [
      '2 add 3 equals multiply 4 equals | sends "5*4" -> 20 | expression "5×4", result "20", error null',
      ['2 add 3 equals', { resolves: 5 }, 'multiply 4 equals', { sends: '5*4', resolves: 20 }],
      { expression: '5×4', result: '20', error: null },
    ],
  ])('%s', check)

  // Rule: after a result, `close_paren`, `backspace` and `equals` do nothing.
  it.each<Row>([
    [
      '2 add 3 equals close_paren | no request | expression "2+3", result "5", error null',
      ['2 add 3 equals', { resolves: 5 }, 'close_paren'],
      { expression: '2+3', result: '5', error: null, request: null },
    ],
    [
      '2 add 3 equals backspace | no request | expression "2+3", result "5", error null',
      ['2 add 3 equals', { resolves: 5 }, 'backspace'],
      { expression: '2+3', result: '5', error: null, request: null },
    ],
    [
      '2 add 3 equals equals | no request | expression "2+3", result "5", error null',
      ['2 add 3 equals', { resolves: 5 }, 'equals'],
      { expression: '2+3', result: '5', error: null, request: null },
    ],
  ])('%s', check)
})

describe('Negative results continued with each operator', () => {
  // Rule: a negative result is wrapped in parentheses when we continue from it.
  it.each<Row>([
    [
      'subtract 5 equals | sends "-5" -> -5 | expression "-5", result "-5", error null',
      ['subtract 5 equals', { sends: '-5', resolves: -5 }],
      { expression: '-5', result: '-5', error: null },
    ],
    [
      'subtract 5 equals add | no request | expression "(-5)+", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'add'],
      { expression: '(-5)+', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals subtract | no request | expression "(-5)-", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'subtract'],
      { expression: '(-5)-', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals multiply | no request | expression "(-5)×", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'multiply'],
      { expression: '(-5)×', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals divide | no request | expression "(-5)÷", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'divide'],
      { expression: '(-5)÷', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals power | no request | expression "(-5)^", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'power'],
      { expression: '(-5)^', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals percentage | no request | expression "(-5)%", result null, error null',
      ['subtract 5 equals', { resolves: -5 }, 'percentage'],
      { expression: '(-5)%', result: null, error: null, request: null },
    ],
    [
      'subtract 5 equals power 2 equals | sends "(-5)^2" -> 25 | expression "(-5)^2", result "25", error null',
      ['subtract 5 equals', { resolves: -5 }, 'power 2 equals', { sends: '(-5)^2', resolves: 25 }],
      { expression: '(-5)^2', result: '25', error: null },
    ],
  ])('%s', check)
})

describe('Results in exponent form', () => {
  // Rule: the result is the number as JavaScript prints it, `String(result)`.
  it.each<Row>([
    [
      '1 divide 1 0 0 0 0 0 0 0 equals | sends "1/10000000" -> 1e-7 | expression "1÷10000000", result "1e-7", error null',
      ['1 divide 1 0 0 0 0 0 0 0 equals', { sends: '1/10000000', resolves: 1e-7 }],
      { expression: '1÷10000000', result: '1e-7', error: null },
    ],
    [
      '1 0 power 2 1 equals | sends "10^21" -> 1e21 | expression "10^21", result "1e+21", error null',
      ['1 0 power 2 1 equals', { sends: '10^21', resolves: 1e21 }],
      { expression: '10^21', result: '1e+21', error: null },
    ],
    [
      '1 0 power 2 1 equals 3 | sends "10^21" -> 1e21 | expression "3", result null, error null',
      ['1 0 power 2 1 equals', { sends: '10^21', resolves: 1e21 }, '3'],
      { expression: '3', result: null, error: null },
    ],
    [
      '1 divide 1 0 0 0 0 0 0 0 equals add 3 equals | sends "1e-7+3" -> 3.0000001 | expression "1e-7+3", result "3.0000001", error null',
      ['1 divide 1 0 0 0 0 0 0 0 equals', { resolves: 1e-7 }, 'add 3 equals', { sends: '1e-7+3', resolves: 3.0000001 }],
      { expression: '1e-7+3', result: '3.0000001', error: null },
    ],
    [
      'subtract 1 divide 1 0 0 0 0 0 0 0 equals power | no request | expression "(-1e-7)^", result null, error null',
      ['subtract 1 divide 1 0 0 0 0 0 0 0 equals', { resolves: -1e-7 }, 'power'],
      { expression: '(-1e-7)^', result: null, error: null, request: null },
    ],
  ])('%s', check)
})

describe('While a request is pending, every key is ignored', () => {
  // Rule: while a request is pending, every key press is ignored.
  it.each<Row>([
    [
      '2 add 3 equals 4 | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"',
      ['2 add 3 equals 4'],
      { expression: '2+3', result: null, error: null, request: { expression: '2+3' } },
    ],
    [
      '2 add 3 equals clear | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"',
      ['2 add 3 equals clear'],
      { expression: '2+3', result: null, error: null, request: { expression: '2+3' } },
    ],
    [
      '2 add 3 equals equals | sends "2+3" -> none yet | expression "2+3", result null, error null, request still "2+3"',
      ['2 add 3 equals equals'],
      { expression: '2+3', result: null, error: null, request: { expression: '2+3' } },
    ],
    [
      // The 4 is pressed while waiting; the answer arrives after it.
      '2 add 3 equals 4 | sends "2+3" -> 5 | expression "2+3", result "5", error null',
      ['2 add 3 equals 4', { sends: '2+3', resolves: 5 }],
      { expression: '2+3', result: '5', error: null },
    ],
    [
      '2 add 3 equals, answer 5, then 4 | sends "2+3" -> 5 | expression "4", result null, error null',
      ['2 add 3 equals', { sends: '2+3', resolves: 5 }, '4'],
      { expression: '4', result: null, error: null },
    ],
  ])('%s', check)
})

describe('Errors: the expression is kept as typed', () => {
  // Rule: when a request fails, `error` is set and the expression stays as
  // typed, without the parentheses equals would have closed.
  it.each<Row>([
    [
      '1 divide 0 equals | sends "1/0" -> rejects "Cannot divide by zero" | expression "1÷0", result null, error "Cannot divide by zero"',
      ['1 divide 0 equals', { sends: '1/0', rejects: 'Cannot divide by zero' }],
      { expression: '1÷0', result: null, error: 'Cannot divide by zero' },
    ],
    [
      'open_paren 2 add equals | sends "(2+)" -> rejects "Invalid input" | expression "(2+", result null, error "Invalid input"',
      ['open_paren 2 add equals', { sends: '(2+)', rejects: 'Invalid input' }],
      { expression: '(2+', result: null, error: 'Invalid input' },
    ],
    [
      '1 multiply sqrt subtract 1 equals | sends "1*sqrt(-1)" -> rejects "Invalid input" | expression "1×√(-1", result null, error "Invalid input"',
      ['1 multiply sqrt subtract 1 equals', { sends: '1*sqrt(-1)', rejects: 'Invalid input' }],
      { expression: '1×√(-1', result: null, error: 'Invalid input' },
    ],
    [
      '2 add 3 equals add equals | sends "5+" -> rejects "Invalid input" | expression "5+", result null, error "Invalid input"',
      ['2 add 3 equals', { resolves: 5 }, 'add equals', { sends: '5+', rejects: 'Invalid input' }],
      { expression: '5+', result: null, error: 'Invalid input' },
    ],
  ])('%s', check)
})

describe('Errors: recovery with another key', () => {
  // Rule: the next key press clears the error and is then applied to the kept
  // expression.
  it.each<Row>([
    [
      '1 divide 0 equals 3 | no request | expression "1÷3", result null, error null',
      ['1 divide 0 equals', { rejects: 'Cannot divide by zero' }, '3'],
      { expression: '1÷3', result: null, error: null, request: null },
    ],
    [
      '2 add equals backspace | sends "2+" -> rejects "Invalid input" | expression "2", result null, error null',
      ['2 add equals', { sends: '2+', rejects: 'Invalid input' }, 'backspace'],
      { expression: '2', result: null, error: null },
    ],
  ])('%s', check)

  // Rule: `equals` after an error clears the error and sends the kept
  // expression again.
  it.each<Row>([
    [
      '1 divide 0 equals equals | sends "1/0" twice, each -> rejects "Cannot divide by zero" | expression "1÷0", result null, error "Cannot divide by zero"',
      [
        '1 divide 0 equals',
        { sends: '1/0', rejects: 'Cannot divide by zero' },
        'equals',
        { sends: '1/0', rejects: 'Cannot divide by zero' },
      ],
      { expression: '1÷0', result: null, error: 'Cannot divide by zero' },
    ],
  ])('%s', check)
})
