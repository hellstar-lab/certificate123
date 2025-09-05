/**
 * Safely extracts error message from unknown error types
 * @param error - The error object (can be any type)
 * @returns A string representation of the error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Try to get message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // Try to stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error object';
    }
  }
  
  return 'Unknown error';
}

/**
 * Creates a standardized error message for network operations
 * @param operation - The operation that failed (e.g., 'loading templates')
 * @param error - The error object
 * @returns A formatted error message
 */
export function createNetworkErrorMessage(operation: string, error: unknown): string {
  const errorMessage = getErrorMessage(error);
  return `Network error while ${operation}: ${errorMessage}`;
}