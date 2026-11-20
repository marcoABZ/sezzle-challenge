import { useRef, useState } from 'react'
import { ApiError, calculate } from '../api/client.ts'
import { initialState, reduce } from './calculatorState.ts'
import type { Action, Key, State } from './calculatorState.ts'

// The display text for each error code. Any other code shows "Error".
const ERROR_TEXT = new Map([
  ['invalid_expression', 'Invalid input'],
  ['division_by_zero', 'Cannot divide by zero'],
  ['negative_square_root', 'Invalid input'],
  ['undefined_result', 'Invalid input'],
  ['result_out_of_range', 'Overflow'],
  ['network_error', 'No connection'],
])

function errorText(error: unknown): string {
  if (error instanceof ApiError) return ERROR_TEXT.get(error.code) ?? 'Error'
  return 'Error'
}

export function useCalculator(): {
  expression: string
  result: string | null
  error: string | null
  busy: boolean
  press: (key: Key) => void
} {
  const [state, setState] = useState(initialState)
  // The handler reads the state from here, not from the last render, so it
  // decides on the request synchronously and never sees a stale state.
  const stateRef = useRef(initialState)

  function apply(action: Action): State {
    const next = reduce(stateRef.current, action)
    stateRef.current = next
    setState(next)
    return next
  }

  function press(key: Key) {
    const before = stateRef.current
    const after = apply({ type: 'key', key })
    if (before.request === null && after.request !== null) {
      calculate(after.request.expression).then(
        (result) => apply({ type: 'resolved', result }),
        (error: unknown) => apply({ type: 'rejected', message: errorText(error) }),
      )
    }
  }

  return {
    expression: state.expression,
    result: state.result,
    error: state.error,
    busy: state.request !== null,
    press,
  }
}
