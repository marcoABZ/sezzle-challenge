import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate } from '../api/client.ts'
import type { Key } from './calculatorState.ts'
import { useCalculator } from './useCalculator.ts'

// The spec doesn't say how an ApiError is built, so the client module is
// replaced whole: the hook gets this class as its ApiError, and the cases
// build their errors with it.
const { FakeApiError } = vi.hoisted(() => {
  class FakeApiError extends Error {
    code: string
    status: number

    constructor(code: string, status: number, message: string) {
      super(message)
      this.code = code
      this.status = status
    }
  }
  return { FakeApiError }
})

vi.mock('../api/client.ts', () => ({ ApiError: FakeApiError, calculate: vi.fn() }))

// How the fake `calculate` answers each call, in order.
type Answer = { resolves: number } | { rejects: Error } | 'pending'

type Expected = Partial<{
  expression: string
  result: string | null
  error: string | null
  busy: boolean
  calls: string[]
}>

type Row = [name: string, keys: Key[], answers: Answer[], expected: Expected]

// The answer has not arrived yet.
function pending(): Promise<number> {
  return new Promise(() => {})
}

beforeEach(() => {
  // A call no case answers stays pending.
  vi.mocked(calculate).mockReset().mockImplementation(pending)
})

function fakeAnswers(answers: Answer[]) {
  for (const answer of answers) {
    if (answer === 'pending') vi.mocked(calculate).mockImplementationOnce(pending)
    else if ('resolves' in answer) vi.mocked(calculate).mockResolvedValueOnce(answer.resolves)
    else vi.mocked(calculate).mockRejectedValueOnce(answer.rejects)
  }
}

function calls(): string[] {
  return vi.mocked(calculate).mock.calls.map(([expression]) => expression)
}

async function pressKeys(keys: Key[]) {
  const { result } = renderHook(() => useCalculator())
  for (const key of keys) {
    // One act per press, like one event per click. Awaiting it lets an answer
    // the fake already gave arrive before the next press.
    await act(async () => {
      result.current.press(key)
    })
  }
  return result
}

async function check(_name: string, keys: Key[], answers: Answer[], expected: Expected) {
  fakeAnswers(answers)
  const result = await pressKeys(keys)
  expect({ ...result.current, calls: calls() }).toMatchObject(expected)
}

describe('The request is made from the key press, once per request', () => {
  // Rule: the hook calls `calculate` once, with `request.expression`, when a
  // key press produces a request.
  it.each<Row>([
    [
      '2 add 3 equals; fake answers later with 5 (still pending) | calculate called once with "2+3" | expression "2+3", result null, error null, busy true',
      ['2', 'add', '3', 'equals'],
      ['pending'],
      { calls: ['2+3'], expression: '2+3', result: null, error: null, busy: true },
    ],
    [
      '2 add 3 equals; fake answers 5 | calculate called once with "2+3" | expression "2+3", result "5", error null, busy false',
      ['2', 'add', '3', 'equals'],
      [{ resolves: 5 }],
      { calls: ['2+3'], expression: '2+3', result: '5', error: null, busy: false },
    ],
    [
      'open_paren 2 add 3 equals; fake answers 5 | calculate called once with "(2+3)" | expression "(2+3)", result "5", error null, busy false',
      ['open_paren', '2', 'add', '3', 'equals'],
      [{ resolves: 5 }],
      { calls: ['(2+3)'], expression: '(2+3)', result: '5', error: null, busy: false },
    ],
    [
      '2 add 3 equals; fake answers later with 5 (still pending), then 4 and equals pressed | calculate called once in total | expression "2+3", result null, error null, busy true',
      ['2', 'add', '3', 'equals', '4', 'equals'],
      ['pending'],
      { calls: ['2+3'], expression: '2+3', result: null, error: null, busy: true },
    ],
    [
      '2 add 3; no equals | calculate never called | expression "2+3", result null, error null, busy false',
      ['2', 'add', '3'],
      [],
      { calls: [], expression: '2+3', result: null, error: null, busy: false },
    ],
    [
      'equals on an empty expression | calculate never called | expression "", result null, error null, busy false',
      ['equals'],
      [],
      { calls: [], expression: '', result: null, error: null, busy: false },
    ],
  ])('%s', check)

  // Rule: the call starts from the key-press handler, not from an effect.
  it('2 add 3 equals, checked straight after `press` returns, before any effect is flushed | calculate has already been called once | busy true', async () => {
    const result = await pressKeys(['2', 'add', '3'])

    let callsWhenPressReturned: string[] = []
    act(() => {
      result.current.press('equals')
      // Still inside act: React has not rendered or run any effect yet.
      callsWhenPressReturned = calls()
    })

    expect(callsWhenPressReturned).toHaveLength(1)
    expect(result.current.busy).toBe(true)
  })
})

describe('Result', () => {
  // Rule: on success, `result` is `String(result)`, and the state is no longer
  // busy.
  it.each<Row>([
    [
      '2 subtract 2 equals; fake answers 0 | expression "2-2", result "0", error null, busy false',
      ['2', 'subtract', '2', 'equals'],
      [{ resolves: 0 }],
      { expression: '2-2', result: '0', error: null, busy: false },
    ],
  ])('%s', check)
})

describe('Errors: display text', () => {
  // Rule: the hook maps the code of the error to the display text. The message
  // of the API is never shown.
  it.each<Row>([
    [
      '1 divide 0 equals; fake rejects ApiError code "division_by_zero" with message "boom" | expression "1÷0", result null, error "Cannot divide by zero", busy false',
      ['1', 'divide', '0', 'equals'],
      [{ rejects: new FakeApiError('division_by_zero', 422, 'boom') }],
      { expression: '1÷0', result: null, error: 'Cannot divide by zero', busy: false },
    ],
    [
      '2 add 3 equals; fake rejects ApiError code "network_error", status 0 | expression "2+3", result null, error "No connection", busy false',
      ['2', 'add', '3', 'equals'],
      [{ rejects: new FakeApiError('network_error', 0, '...') }],
      { expression: '2+3', result: null, error: 'No connection', busy: false },
    ],
    [
      'sqrt subtract 1 equals; fake rejects ApiError code "negative_square_root" | calculate called with "sqrt(-1)", error "Invalid input"',
      ['sqrt', 'subtract', '1', 'equals'],
      [{ rejects: new FakeApiError('negative_square_root', 422, '...') }],
      { calls: ['sqrt(-1)'], error: 'Invalid input' },
    ],
    [
      'open_paren subtract 8 close_paren power decimal 5 equals; fake rejects ApiError code "undefined_result" | calculate called with "(-8)^0.5", error "Invalid input"',
      ['open_paren', 'subtract', '8', 'close_paren', 'power', 'decimal', '5', 'equals'],
      [{ rejects: new FakeApiError('undefined_result', 422, '...') }],
      { calls: ['(-8)^0.5'], error: 'Invalid input' },
    ],
    [
      '1 0 power 4 0 0 equals; fake rejects ApiError code "result_out_of_range" | calculate called with "10^400", error "Overflow"',
      ['1', '0', 'power', '4', '0', '0', 'equals'],
      [{ rejects: new FakeApiError('result_out_of_range', 422, '...') }],
      { calls: ['10^400'], error: 'Overflow' },
    ],
    [
      '2 add 3 equals; fake rejects ApiError code "invalid_expression" | error "Invalid input"',
      ['2', 'add', '3', 'equals'],
      [{ rejects: new FakeApiError('invalid_expression', 422, '...') }],
      { error: 'Invalid input' },
    ],
    [
      '2 add 3 equals; fake rejects ApiError code "internal_error" | error "Error"',
      ['2', 'add', '3', 'equals'],
      [{ rejects: new FakeApiError('internal_error', 500, '...') }],
      { error: 'Error' },
    ],
    [
      '2 add 3 equals; fake rejects ApiError code "invalid_response" | error "Error"',
      ['2', 'add', '3', 'equals'],
      [{ rejects: new FakeApiError('invalid_response', 502, '...') }],
      { error: 'Error' },
    ],
    [
      '2 add 3 equals; fake rejects with a plain Error("x") (not ApiError) | error "Error"',
      ['2', 'add', '3', 'equals'],
      [{ rejects: new Error('x') }],
      { error: 'Error' },
    ],
  ])('%s', check)
})

describe('Errors: the expression is kept, and the next press is applied', () => {
  // Rule: after a failure, the expression is kept and the next key is applied
  // to it.
  it.each<Row>([
    [
      '1 divide 0 equals equals; fake rejects both times | calculate called twice, both with "1/0" | expression "1÷0", result null, error "Cannot divide by zero", busy false',
      ['1', 'divide', '0', 'equals', 'equals'],
      [
        { rejects: new FakeApiError('division_by_zero', 422, 'cannot divide by zero') },
        { rejects: new FakeApiError('division_by_zero', 422, 'cannot divide by zero') },
      ],
      {
        calls: ['1/0', '1/0'],
        expression: '1÷0',
        result: null,
        error: 'Cannot divide by zero',
        busy: false,
      },
    ],
  ])('%s', check)
})

describe('After an answer', () => {
  // Rule: keys work again once the answer has arrived.
  it.each<Row>([
    [
      '2 add 3 equals; fake answers 5; then 7 | calculate called once with "2+3" | expression "7", result null, error null, busy false',
      ['2', 'add', '3', 'equals', '7'],
      [{ resolves: 5 }],
      { calls: ['2+3'], expression: '7', result: null, error: null, busy: false },
    ],
  ])('%s', check)
})
