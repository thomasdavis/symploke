export type ApiResponse<T = unknown> = {
  data?: T
  error?: {
    code: string
    message: string
  }
}
