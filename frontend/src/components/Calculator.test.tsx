import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

// The client module is replaced whole, as in the hook tests. The fake
// `calculate` is made here too, because components can't import `src/api`.
const { FakeApiError, calculate } = vi.hoisted(() => {
  class FakeApiError extends Error {
    code: string
    status: number

    constructor(code: string, status: number, message: string) {
      super(message)
      this.code = code
      this.status = status
    }
  }
  return { FakeApiError, calculate: vi.fn<(expression: string) => Promise<number>>() }
})

vi.mock('../api/client.ts', () => ({ ApiError: FakeApiError, calculate }))

// How the fake `calculate` answers each call, in order. `rejects` is the
// error code.
type Answer = { resolves: number } | { rejects: string } | 'pending'

// `click` takes button names, `type` is user-event keyboard syntax, and
// `focus` focuses a button without pressing it.
type Step = { click: string[] } | { type: string } | { focus: string }

type Expected = Partial<{
  calls: string[]
  // Each is a whole line on the display.
  shows: string[]
  // Each appears on no line of the display.
  absent: string[]
  status: string
  busy: 'true' | 'false'
}>

type Row = [name: string, steps: Step[], answers: Answer[], expected: Expected]

// The answer has not arrived yet.
function pending(): Promise<number> {
  return new Promise(() => {})
}

beforeEach(() => {
  // A call no case answers stays pending.
  calculate.mockReset().mockImplementation(pending)
})

function fakeAnswers(answers: Answer[]) {
  for (const answer of answers) {
    if (answer === 'pending') calculate.mockImplementationOnce(pending)
    else if ('resolves' in answer) calculate.mockResolvedValueOnce(answer.resolves)
    else calculate.mockRejectedValueOnce(new FakeApiError(answer.rejects, 422, 'message from the API'))
  }
}

function calls(): string[] {
  return calculate.mock.calls.map(([expression]) => expression)
}

function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}

function display(): HTMLElement {
  return screen.getByRole('region', { name: 'Display' })
}

function displayLines(): string[] {
  return within(display())
    .getAllByRole('paragraph')
    .map((line) => line.textContent)
}

async function perform(user: UserEvent, step: Step) {
  if ('click' in step) {
    for (const name of step.click) await user.click(button(name))
  } else if ('type' in step) {
    await user.keyboard(step.type)
  } else {
    button(step.focus).focus()
  }
}

async function check(_name: string, steps: Step[], answers: Answer[], expected: Expected) {
  fakeAnswers(answers)
  const user = userEvent.setup()
  render(<App />)
  for (const step of steps) await perform(user, step)

  if (expected.calls) expect(calls()).toEqual(expected.calls)
  const lines = displayLines()
  for (const text of expected.shows ?? []) expect(lines).toContain(text)
  for (const text of expected.absent ?? []) {
    expect(lines.filter((line) => line.includes(text))).toEqual([])
  }
  if (expected.status !== undefined) expect(screen.getByRole('status').textContent).toBe(expected.status)
  if (expected.busy) expect(display()).toHaveAttribute('aria-busy', expected.busy)
}

describe('The screen', () => {
  // Rule: one level-1 heading "Calculator", and a group "Keypad" holding the
  // 23 keys in keypad order.
  it.each<[name: string, heading: string, keypad: string[]]>([
    [
      'no keys | heading "Calculator"; group "Keypad" holds exactly these buttons, in order: Clear, Open parenthesis, Close parenthesis, Backspace, Square root, Power, Percent, Divide, 7, 8, 9, Multiply, 4, 5, 6, Minus, 1, 2, 3, Plus, 0, Decimal point, Equals',
      'Calculator',
      [
        'Clear',
        'Open parenthesis',
        'Close parenthesis',
        'Backspace',
        'Square root',
        'Power',
        'Percent',
        'Divide',
        '7',
        '8',
        '9',
        'Multiply',
        '4',
        '5',
        '6',
        'Minus',
        '1',
        '2',
        '3',
        'Plus',
        '0',
        'Decimal point',
        'Equals',
      ],
    ],
  ])('%s', (_name, heading, keypad) => {
    render(<App />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveAccessibleName(heading)

    const buttons = within(screen.getByRole('group', { name: 'Keypad' })).getAllByRole('button')
    expect(buttons).toHaveLength(keypad.length)
    buttons.forEach((key, index) => expect(key).toHaveAccessibleName(keypad[index]))
  })
})

describe('The display', () => {
  // Rule: an empty expression shows 0.
  it.each<Row>([['no keys | display shows "0"; status empty', [], [], { shows: ['0'], status: '' }]])(
    '%s',
    check,
  )

  // Rule: after a result, the display shows the sent expression and the
  // result, and the status announces it.
  it.each<Row>([
    [
      'click 2 Plus 3 Equals; fake answers 5 | calculate called once with "2+3"; display shows "2+3" and "5"; status "Equals 5"',
      [{ click: ['2', 'Plus', '3', 'Equals'] }],
      [{ resolves: 5 }],
      { calls: ['2+3'], shows: ['2+3', '5'], status: 'Equals 5' },
    ],
  ])('%s', check)

  // Rule: after an error, the display shows the kept expression and the error
  // text, and the status announces the error.
  it.each<Row>([
    [
      'click 1 Divide 0 Equals; fake rejects division_by_zero | display shows "1÷0" and "Cannot divide by zero"; status "Cannot divide by zero"',
      [{ click: ['1', 'Divide', '0', 'Equals'] }],
      [{ rejects: 'division_by_zero' }],
      { shows: ['1÷0', 'Cannot divide by zero'], status: 'Cannot divide by zero' },
    ],
  ])('%s', check)

  // Rule: the next key after an error removes the error from the screen.
  it.each<Row>([
    [
      'click 1 Divide 0 Equals; fake rejects division_by_zero; click 2 | display shows "1÷02" and no error text; status empty',
      [{ click: ['1', 'Divide', '0', 'Equals'] }, { click: ['2'] }],
      [{ rejects: 'division_by_zero' }],
      { shows: ['1÷02'], absent: ['Cannot divide by zero'], status: '' },
    ],
  ])('%s', check)

  // Rule: while a request is pending, the display is busy.
  it.each<Row>([
    [
      'click 2 Plus 3 Equals; fake pending | display has aria-busy "true"',
      [{ click: ['2', 'Plus', '3', 'Equals'] }],
      ['pending'],
      { busy: 'true' },
    ],
    [
      'click 2 Plus 3 Equals; fake answers 5 | display has aria-busy "false"',
      [{ click: ['2', 'Plus', '3', 'Equals'] }],
      [{ resolves: 5 }],
      { busy: 'false' },
    ],
  ])('%s', check)

  // Rule: the display shows the state's text unchanged; styling never
  // replaces a character.
  it.each<Row>([
    ['click 2 Power 3 | display shows "2^3"', [{ click: ['2', 'Power', '3'] }], [], { shows: ['2^3'] }],
    [
      'click 2 Minus 9 Equals; fake answers -7 | display shows "-7"; status "Equals -7"',
      [{ click: ['2', 'Minus', '9', 'Equals'] }],
      [{ resolves: -7 }],
      { shows: ['-7'], status: 'Equals -7' },
    ],
  ])('%s', check)
})

describe('Clicking keys', () => {
  // Rule: each button presses its key.
  it.each<Row>([
    [
      'click 1 2 3 4 5 6 7 8 9 0 | display shows "1234567890"',
      [{ click: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] }],
      [],
      { shows: ['1234567890'] },
    ],
    [
      'click 1 "Decimal point" 5 | display shows "1.5"',
      [{ click: ['1', 'Decimal point', '5'] }],
      [],
      { shows: ['1.5'] },
    ],
    [
      'click 2 Plus 3 Minus 4 Multiply 5 Divide 6 Power 2 Percent | display shows "2+3-4×5÷6^2%"',
      [{ click: ['2', 'Plus', '3', 'Minus', '4', 'Multiply', '5', 'Divide', '6', 'Power', '2', 'Percent'] }],
      [],
      { shows: ['2+3-4×5÷6^2%'] },
    ],
    [
      'click "Open parenthesis" "Square root" 9 "Close parenthesis" "Close parenthesis" | display shows "(√(9))"',
      [{ click: ['Open parenthesis', 'Square root', '9', 'Close parenthesis', 'Close parenthesis'] }],
      [],
      { shows: ['(√(9))'] },
    ],
    ['click 1 2 Backspace | display shows "1"', [{ click: ['1', '2', 'Backspace'] }], [], { shows: ['1'] }],
    ['click 1 2 Clear | display shows "0"', [{ click: ['1', '2', 'Clear'] }], [], { shows: ['0'] }],
  ])('%s', check)
})

describe('Typing on the keyboard', () => {
  // Rule: the physical keys in the map press their calculator key.
  it.each<Row>([
    ['type "1234567890" | display shows "1234567890"', [{ type: '1234567890' }], [], { shows: ['1234567890'] }],
    ['type "1.5+2,5" | display shows "1.5+2.5"', [{ type: '1.5+2,5' }], [], { shows: ['1.5+2.5'] }],
    [
      'type "2+3-4*5/6^2%" | display shows "2+3-4×5÷6^2%"',
      [{ type: '2+3-4*5/6^2%' }],
      [],
      { shows: ['2+3-4×5÷6^2%'] },
    ],
    ['type "2x3X4" | display shows "2×3×4"', [{ type: '2x3X4' }], [], { shows: ['2×3×4'] }],
    ['type "r9)R4" | display shows "√(9)√(4"', [{ type: 'r9)R4' }], [], { shows: ['√(9)√(4'] }],
    ['type "(1)" | display shows "(1)"', [{ type: '(1)' }], [], { shows: ['(1)'] }],
    ['type "12{Backspace}" | display shows "1"', [{ type: '12{Backspace}' }], [], { shows: ['1'] }],
    ['type "12{Escape}" | display shows "0"', [{ type: '12{Escape}' }], [], { shows: ['0'] }],
    ['type "12{Delete}" | display shows "0"', [{ type: '12{Delete}' }], [], { shows: ['0'] }],
    [
      'type "2+3{Enter}"; fake answers 5 | calculate called once with "2+3"; display shows "5"',
      [{ type: '2+3{Enter}' }],
      [{ resolves: 5 }],
      { calls: ['2+3'], shows: ['5'] },
    ],
    [
      'type "2+3="; fake answers 5 | calculate called once with "2+3"',
      [{ type: '2+3=' }],
      [{ resolves: 5 }],
      { calls: ['2+3'] },
    ],
  ])('%s', check)

  // Rule: presses with Ctrl, Cmd or Alt held press nothing.
  it.each<Row>([
    [
      'type "{Control>}r{/Control}{Meta>}r{/Meta}{Alt>}r{/Alt}" | display shows "0"',
      [{ type: '{Control>}r{/Control}{Meta>}r{/Meta}{Alt>}r{/Alt}' }],
      [],
      { shows: ['0'] },
    ],
  ])('%s', check)

  // Rule: keys outside the map do nothing.
  it.each<Row>([['type "a" | display shows "0"', [{ type: 'a' }], [], { shows: ['0'] }]])('%s', check)

  // Rule: Enter always means equals, even when a key button has focus.
  it.each<Row>([
    [
      'click 7 (focus stays on it); type "{Enter}"; fake answers 7 | calculate called once with "7"; display never shows "77"',
      [{ click: ['7'] }, { type: '{Enter}' }],
      [{ resolves: 7 }],
      { calls: ['7'], absent: ['77'] },
    ],
  ])('%s', check)

  // Rule: Space presses the focused key.
  it.each<Row>([['focus the 7 button; type " " | display shows "7"', [{ focus: '7' }, { type: ' ' }], [], { shows: ['7'] }]])(
    '%s',
    check,
  )
})

describe('Focus', () => {
  // Rule: focus moves through the keys in keypad order.
  it.each<[name: string, order: string[]]>([
    [
      'press Tab twice from the start of the page | focus on Clear, then on "Open parenthesis"',
      ['Clear', 'Open parenthesis'],
    ],
  ])('%s', async (_name, order) => {
    const user = userEvent.setup()
    render(<App />)

    for (const name of order) {
      await user.tab()
      expect(button(name)).toHaveFocus()
    }
  })
})
