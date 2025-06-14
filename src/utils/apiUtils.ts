/**
 * API utilities for rate limiting and sequential operations
 */

/**
 * Executes promises sequentially with delays between them to avoid rate limiting
 */
export async function executeSequentially<T>(
  operations: (() => Promise<T>)[],
  delayMs: number = 300
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await operations[i]();
      results.push(result);
      
      // Add delay between operations (except after the last one)
      if (i < operations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Operation ${i + 1}/${operations.length} failed:`, error);
      throw error;
    }
  }
  
  return results;
}

/**
 * Executes promises with retry logic and exponential backoff
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Batches an array into smaller chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Executes operations in batches with delays between batches
 */
export async function executeBatched<T>(
  items: T[],
  operation: (item: T) => Promise<any>,
  batchSize: number = 5,
  delayBetweenBatchesMs: number = 1000
): Promise<any[]> {
  const batches = batchArray(items, batchSize);
  const results: any[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)...`);
    
    // Execute all operations in the current batch in parallel
    const batchPromises = batch.map(item => operation(item));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results and collect successful ones
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Item ${index + 1} in batch ${i + 1} failed:`, result.reason);
      }
    });
    
    // Add delay between batches (except after the last one)
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }
  
  return results;
} 