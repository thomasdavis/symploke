export type ErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public metadata?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
