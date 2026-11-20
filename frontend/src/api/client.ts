// Set at build time. Unset or empty means the API is on the same origin.
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  // From the API, or 'network_error' / 'invalid_response'.
  code: string
  // The HTTP status, 0 when there was no response.
  status: number

  constructor(code: string, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type Success = { result: number }

type Failure = { error: { code: string; message: string } }

export async function calculate(expression: string): Promise<number> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/calculations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    })
  } catch {
    throw new ApiError('network_error', 0, 'could not reach the API')
  }

  const body = await readJson(response)
  if (response.status === 200 && isSuccess(body)) return body.result
  if (response.status !== 200 && isFailure(body)) {
    throw new ApiError(body.error.code, response.status, body.error.message)
  }
  throw new ApiError('invalid_response', response.status, `unexpected response with status ${response.status}`)
}

// A body that is not JSON reads as undefined, which no shape check accepts.
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSuccess(body: unknown): body is Success {
  return isObject(body) && typeof body.result === 'number'
}

function isFailure(body: unknown): body is Failure {
  return (
    isObject(body) &&
    isObject(body.error) &&
    typeof body.error.code === 'string' &&
    typeof body.error.message === 'string'
  )
}
