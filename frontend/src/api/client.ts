export class ApiError extends Error {
  // From the API, or 'network_error' / 'invalid_response'.
  code: string
  // The HTTP status, 0 when there was no response.
  status: number

  constructor() {
    super('not implemented')
    throw new Error('not implemented')
  }
}

export function calculate(_expression: string): Promise<number> {
  throw new Error('not implemented')
}
