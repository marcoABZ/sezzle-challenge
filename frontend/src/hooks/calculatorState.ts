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
  // The shown form: "2+3×4".
  expression: string
  result: string | null
  error: string | null
  // The sent form: "2+3*4". Set while waiting for the answer.
  request: { expression: string } | null
}

export const initialState: State = {
  expression: '',
  result: null,
  error: null,
  request: null,
}

const MAX_DIGITS = 15

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

type Digit = (typeof DIGITS)[number]

// What each key other than a digit or the decimal point adds to the shown
// expression.
const SHOWN = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '%',
  sqrt: '√(',
  open_paren: '(',
  close_paren: ')',
} as const

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'key':
      return pressKey(state, action.key)
    case 'resolved':
      // The expression becomes what was sent, in its shown form. It hasn't
      // changed while waiting, so closing it again gives the same text.
      return {
        expression: closeParentheses(state.expression),
        result: String(action.result),
        error: null,
        request: null,
      }
    case 'rejected':
      // The expression stays as typed, so it can be fixed.
      return { ...state, error: action.message, request: null }
  }
}

function pressKey(state: State, key: Key): State {
  if (state.request !== null) return state
  if (key === 'clear') return initialState
  if (state.result !== null) return pressAfterResult(state, state.result, key)

  // Any key clears an error and then applies to the kept expression.
  const { expression } = state
  if (key === 'equals') {
    if (expression === '') return state
    return { ...state, error: null, request: { expression: toSent(closeParentheses(expression)) } }
  }
  return { ...state, error: null, expression: edit(expression, key) }
}

function pressAfterResult(state: State, result: string, key: Exclude<Key, 'clear'>): State {
  switch (key) {
    case 'close_paren':
    case 'backspace':
    case 'equals':
      return state
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
    case 'power':
    case 'percentage':
      return { ...initialState, expression: continueFrom(result) + SHOWN[key] }
    default:
      return { ...initialState, expression: edit('', key) }
  }
}

function edit(expression: string, key: Exclude<Key, 'clear' | 'equals'>): string {
  if (key === 'backspace') return removeLast(expression)
  if (key === 'decimal') return typeDecimal(expression)
  if (isDigit(key)) return typeDigit(expression, key)
  return expression + SHOWN[key]
}

function isDigit(key: Key): key is Digit {
  return DIGITS.some((digit) => digit === key)
}

function typeDigit(expression: string, digit: Digit): string {
  const number = currentNumber(expression)
  if (number === '0') return expression.slice(0, -1) + digit
  if (number.replaceAll('.', '').length >= MAX_DIGITS) return expression
  return expression + digit
}

function typeDecimal(expression: string): string {
  const number = currentNumber(expression)
  if (number === '') return expression + '0.'
  if (number.includes('.')) return expression
  return expression + '.'
}

function removeLast(expression: string): string {
  const length = expression.endsWith(SHOWN.sqrt) ? SHOWN.sqrt.length : 1
  return expression.slice(0, -length)
}

// The number being typed: the digits and point at the end of the expression.
// Read from the text, so it stays right after a backspace.
function currentNumber(expression: string): string {
  return expression.slice(expression.search(/[\d.]*$/))
}

// A negative result is wrapped because the power operator binds tighter than
// a minus sign: (-5)^2 is 25, -5^2 is -25.
function continueFrom(result: string): string {
  return result.startsWith('-') ? `(${result})` : result
}

function closeParentheses(expression: string): string {
  let open = 0
  for (const char of expression) {
    if (char === '(') open++
    // A ")" with nothing open closes nothing.
    else if (char === ')' && open > 0) open--
  }
  return expression + ')'.repeat(open)
}

// The shown form only differs from the sent form in these symbols, so the
// sent form is derived from it.
function toSent(shown: string): string {
  return shown.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('√', 'sqrt')
}
