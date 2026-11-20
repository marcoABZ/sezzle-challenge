import type { Key } from './calculatorState.ts'

export function useCalculator(): {
  expression: string
  result: string | null
  error: string | null
  busy: boolean
  press: (key: Key) => void
} {
  throw new Error('not implemented')
}
