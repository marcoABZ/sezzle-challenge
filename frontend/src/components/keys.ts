import type { Key } from '../hooks/calculatorState.ts'

export type KeyKind = 'digit' | 'operator' | 'function' | 'equals'

export type KeyDef = {
  key: Key
  label: string
  // The accessible name, when the label alone doesn't say what the key does.
  name?: string
  kind: KeyKind
  // KeyboardEvent.key values that press this key.
  keyboard: string[]
}

function digit(key: Extract<Key, `${number}`>): KeyDef {
  return { key, label: key, kind: 'digit', keyboard: [key] }
}

// In keypad order: four columns, six rows, with 0 two columns wide.
export const KEYS: KeyDef[] = [
  { key: 'clear', label: 'AC', name: 'Clear', kind: 'function', keyboard: ['Escape', 'Delete'] },
  { key: 'open_paren', label: '(', name: 'Open parenthesis', kind: 'function', keyboard: ['('] },
  { key: 'close_paren', label: ')', name: 'Close parenthesis', kind: 'function', keyboard: [')'] },
  { key: 'backspace', label: '⌫', name: 'Backspace', kind: 'function', keyboard: ['Backspace'] },
  { key: 'sqrt', label: '√', name: 'Square root', kind: 'operator', keyboard: ['r', 'R'] },
  { key: 'power', label: 'xʸ', name: 'Power', kind: 'operator', keyboard: ['^'] },
  { key: 'percentage', label: '%', name: 'Percent', kind: 'operator', keyboard: ['%'] },
  { key: 'divide', label: '÷', name: 'Divide', kind: 'operator', keyboard: ['/'] },
  digit('7'),
  digit('8'),
  digit('9'),
  { key: 'multiply', label: '×', name: 'Multiply', kind: 'operator', keyboard: ['*', 'x', 'X'] },
  digit('4'),
  digit('5'),
  digit('6'),
  { key: 'subtract', label: '−', name: 'Minus', kind: 'operator', keyboard: ['-'] },
  digit('1'),
  digit('2'),
  digit('3'),
  { key: 'add', label: '+', name: 'Plus', kind: 'operator', keyboard: ['+'] },
  digit('0'),
  { key: 'decimal', label: '.', name: 'Decimal point', kind: 'digit', keyboard: ['.', ','] },
  { key: 'equals', label: '=', name: 'Equals', kind: 'equals', keyboard: ['Enter', '='] },
]

const BY_KEYBOARD = new Map(
  KEYS.flatMap((def) => def.keyboard.map((keyboardKey) => [keyboardKey, def.key] as const)),
)

// The calculator key a physical key press stands for. Presses with Ctrl, Cmd
// or Alt belong to the browser (reload, copy, find), so they map to nothing.
export function keyForKeyboard(event: KeyboardEvent): Key | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined
  return BY_KEYBOARD.get(event.key)
}
