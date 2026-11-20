import type { Mock } from 'vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './client.ts'

// The fake fetch answers as the case says, whatever the expression.
const EXPRESSION = '2+3'

type FakeResponse = { status: number; body: string; headers?: Record<string, string> }

type ExpectedError = { code: string; status?: number; message?: string }

type ErrorRow = [name: string, response: FakeResponse, expected: ExpectedError]

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function stubFetch({ status, body, headers }: FakeResponse): Mock<typeof fetch> {
  // Every API response is JSON, so that is the content type unless the case
  // says otherwise.
  const response = new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  const fake = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', fake)
  return fake
}

function requestSeen(fake: Mock<typeof fetch>) {
  const call = fake.mock.lastCall
  if (call === undefined) throw new Error('fetch was not called')
  const [input, init] = call
  const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
  return {
    method: init?.method,
    url: String(input),
    contentType: new Headers(init?.headers).get('Content-Type'),
    body,
  }
}

async function checkRejection(_name: string, response: FakeResponse, expected: ExpectedError) {
  stubFetch(response)
  const error = await calculate(EXPRESSION).catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject(expected)
}

describe('Request shape', () => {
  // Rule: `calculate` sends a `POST` to the base URL plus `/calculations`, with
  // `Content-Type: application/json` and the body `{ "expression": ... }`.
  it.each<[
    name: string,
    base: string | undefined,
    expression: string,
    result: number,
    seen: Partial<ReturnType<typeof requestSeen>>,
  ]>([
    [
      'calculate("2 + 3 * 4") with the default base | fake fetch sees POST "/api/v1/calculations", Content-Type application/json, body {"expression":"2 + 3 * 4"} | resolves 14',
      undefined,
      '2 + 3 * 4',
      14,
      {
        method: 'POST',
        url: '/api/v1/calculations',
        contentType: 'application/json',
        body: { expression: '2 + 3 * 4' },
      },
    ],
    [
      'calculate("2+3") with VITE_API_BASE_URL "https://api.example.test/api/v1" | fake fetch sees POST "https://api.example.test/api/v1/calculations" | resolves 5',
      'https://api.example.test/api/v1',
      '2+3',
      5,
      { method: 'POST', url: 'https://api.example.test/api/v1/calculations' },
    ],
  ])('%s', async (_name, base, expression, result, seen) => {
    vi.stubEnv('VITE_API_BASE_URL', base)
    // A fresh copy of the module, so a base URL read when it loads sees the stub.
    vi.resetModules()
    const client = await import('./client.ts')
    const fake = stubFetch({ status: 200, body: JSON.stringify({ result }) })

    await expect(client.calculate(expression)).resolves.toBe(result)
    expect(requestSeen(fake)).toMatchObject(seen)
  })
})

describe('Success', () => {
  // Rule: a `200` resolves with `result`.
  it.each<[name: string, body: string, result: number]>([
    ['200 {"result":14} | resolves 14 (a number)', '{"result":14}', 14],
    ['200 {"result":0} | resolves 0', '{"result":0}', 0],
  ])('%s', async (_name, body, result) => {
    stubFetch({ status: 200, body })
    await expect(calculate(EXPRESSION)).resolves.toBe(result)
  })
})

describe('Documented errors', () => {
  // Rule: an error response in the documented shape rejects with an `ApiError`
  // carrying its `code`, its `message` and its status.
  it.each<ErrorRow>([
    [
      '400 {"error":{"code":"invalid_request","message":"..."}} | rejects ApiError code "invalid_request", status 400, with the message',
      { status: 400, body: '{"error":{"code":"invalid_request","message":"..."}}' },
      { code: 'invalid_request', status: 400, message: '...' },
    ],
    [
      '404 {"error":{"code":"not_found","message":"..."}} | rejects ApiError code "not_found", status 404',
      { status: 404, body: '{"error":{"code":"not_found","message":"..."}}' },
      { code: 'not_found', status: 404 },
    ],
    [
      '405 {"error":{"code":"method_not_allowed","message":"..."}} with an Allow header | rejects ApiError code "method_not_allowed", status 405',
      {
        status: 405,
        body: '{"error":{"code":"method_not_allowed","message":"..."}}',
        headers: { Allow: 'POST' },
      },
      { code: 'method_not_allowed', status: 405 },
    ],
    [
      '415 {"error":{"code":"unsupported_media_type","message":"..."}} | rejects ApiError code "unsupported_media_type", status 415',
      { status: 415, body: '{"error":{"code":"unsupported_media_type","message":"..."}}' },
      { code: 'unsupported_media_type', status: 415 },
    ],
    [
      '422 {"error":{"code":"invalid_expression","message":"..."}} | rejects ApiError code "invalid_expression", status 422',
      { status: 422, body: '{"error":{"code":"invalid_expression","message":"..."}}' },
      { code: 'invalid_expression', status: 422 },
    ],
    [
      '422 {"error":{"code":"division_by_zero","message":"cannot divide by zero"}} | rejects ApiError code "division_by_zero", status 422',
      { status: 422, body: '{"error":{"code":"division_by_zero","message":"cannot divide by zero"}}' },
      { code: 'division_by_zero', status: 422 },
    ],
    [
      '422 {"error":{"code":"negative_square_root","message":"..."}} | rejects ApiError code "negative_square_root", status 422',
      { status: 422, body: '{"error":{"code":"negative_square_root","message":"..."}}' },
      { code: 'negative_square_root', status: 422 },
    ],
    [
      '422 {"error":{"code":"undefined_result","message":"..."}} | rejects ApiError code "undefined_result", status 422',
      { status: 422, body: '{"error":{"code":"undefined_result","message":"..."}}' },
      { code: 'undefined_result', status: 422 },
    ],
    [
      '422 {"error":{"code":"result_out_of_range","message":"..."}} | rejects ApiError code "result_out_of_range", status 422',
      { status: 422, body: '{"error":{"code":"result_out_of_range","message":"..."}}' },
      { code: 'result_out_of_range', status: 422 },
    ],
    [
      '500 {"error":{"code":"internal_error","message":"..."}} | rejects ApiError code "internal_error", status 500',
      { status: 500, body: '{"error":{"code":"internal_error","message":"..."}}' },
      { code: 'internal_error', status: 500 },
    ],
  ])('%s', checkRejection)
})

describe('Failed fetch', () => {
  // Rule: a failed `fetch` rejects with code `network_error` and status `0`.
  it('fake fetch rejects with TypeError("Failed to fetch") | rejects ApiError code "network_error", status 0', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await calculate(EXPRESSION).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'network_error', status: 0 })
  })
})

describe('Responses that are not JSON', () => {
  // Rule: any other response rejects with code `invalid_response`.
  it.each<ErrorRow>([
    [
      '502 with Content-Type text/html and body "<html>Bad Gateway</html>" | rejects ApiError code "invalid_response", status 502',
      { status: 502, body: '<html>Bad Gateway</html>', headers: { 'Content-Type': 'text/html' } },
      { code: 'invalid_response', status: 502 },
    ],
    [
      '200 with Content-Type text/plain and body "OK" | rejects ApiError code "invalid_response"',
      { status: 200, body: 'OK', headers: { 'Content-Type': 'text/plain' } },
      { code: 'invalid_response' },
    ],
  ])('%s', checkRejection)
})

describe('JSON in the wrong shape', () => {
  // Rule: a 200 without a numeric `result` is not a success, so it rejects
  // with `invalid_response`.
  it.each<ErrorRow>([
    ['200 {} | rejects ApiError code "invalid_response"', { status: 200, body: '{}' }, { code: 'invalid_response' }],
    [
      '200 {"result":"14"} | rejects ApiError code "invalid_response"',
      { status: 200, body: '{"result":"14"}' },
      { code: 'invalid_response' },
    ],
    ['200 null | rejects ApiError code "invalid_response"', { status: 200, body: 'null' }, { code: 'invalid_response' }],
    [
      '422 {"error":"division by zero"} | rejects ApiError code "invalid_response"',
      { status: 422, body: '{"error":"division by zero"}' },
      { code: 'invalid_response' },
    ],
  ])('%s', checkRejection)
})
