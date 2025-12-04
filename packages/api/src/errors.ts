/**
 * Maps technical error messages to human-friendly versions
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
  'Network request failed': 'Unable to connect. Please check your internet connection.',

  // Auth errors
  Unauthorized: 'You need to sign in to do that.',
  Forbidden: "You don't have permission to do that.",

  // Validation errors
  'Name is required': 'Please enter a name.',
  'Invalid email': 'Please enter a valid email address.',
  'Password too short': 'Password must be at least 8 characters.',

  // Server errors
  'Internal server error': 'Something went wrong on our end. Please try again.',
  'Service unavailable': 'The service is temporarily unavailable. Please try again later.',

  // Default fallback
  default: 'Something went wrong. Please try again.',
}

/**
 * Converts technical error messages to human-friendly ones
 */
export function humanizeError(error: string | Error): string {
  const message = typeof error === 'string' ? error : error.message

  // Check for exact match first
  if (ERROR_MESSAGES[message]) {
    return ERROR_MESSAGES[message]
  }

  // Check for partial matches (case-insensitive)
  const lowerMessage = message.toLowerCase()
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value
    }
  }

  // Return default friendly message if no match
  return ERROR_MESSAGES.default || 'Something went wrong. Please try again.'
}
