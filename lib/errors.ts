// lib/errors.ts
// Centralized error handling utilities

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    )
  }
  return false
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode === 401 || error.statusCode === 403
  }
  if (error instanceof Error) {
    return error.message.includes('auth') || error.message.includes('unauthorized')
  }
  return false
}

export function getUserFriendlyMessage(error: unknown, action: string): string {
  const errorMsg = getErrorMessage(error)
  
  // Network errors
  if (isNetworkError(error)) {
    return 'Connection issue. Please check your internet and try again.'
  }
  
  // Auth errors
  if (isAuthError(error)) {
    return 'Session expired. Please log in again.'
  }
  
  // Specific error patterns
  if (errorMsg.includes('permission')) {
    return `You don't have permission to ${action}`
  }
  
  if (errorMsg.includes('not found')) {
    return `The requested item was not found`
  }
  
  if (errorMsg.includes('already exists')) {
    return 'This item already exists'
  }
  
  // Default: use the actual error message
  return errorMsg || `Failed to ${action}. Please try again.`
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry auth errors or non-network errors
      if (isAuthError(error) || !isNetworkError(error)) {
        throw error
      }
      
      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
    }
  }
  
  throw lastError
}