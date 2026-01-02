/**
 * Retry utility for database operations
 * Helps handle transient connection errors
 */

export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a connection error
      const isConnectionError = 
        error instanceof Error && (
          error.message.includes("Closed") ||
          error.message.includes("connection") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ETIMEDOUT")
        );
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}
