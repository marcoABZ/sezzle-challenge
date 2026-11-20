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

export function reduce(_state: State, _action: Action): State {
  throw new Error('not implemented')
}
