/**
 * Enhanced retry helper for API operations
 * - Exponential backoff with jitter
 * - Different retry strategies based on error types
 * - Better logging and error tracking
 */
interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    context?: string;
    logContext?: Record<string, any>;
    retryCondition?: (error: any, attempts: number, maxRetries: number) => Promise<boolean> | boolean;
}
interface RetryInfo {
    attemptNumber: number;
    maxRetries: number;
    willRetry: boolean;
    context: Record<string, any>;
}
interface RetryStats {
    attempts: number;
    totalTime: number;
    success?: boolean;
}
interface ExtendedError extends Error {
    status?: number;
    code?: string;
    retryInfo?: RetryInfo;
    retryStats?: RetryStats;
}
/**
 * Retry helper class for API operations
 */
export default class RetryHelper {
    /**
     * Retry an operation with configurable backoff strategy
     *
     * @param operation - Async function to retry
     * @param options - Configuration options
     * @returns Result of operation
     */
    static withRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
    /**
     * Calculate exponential backoff with jitter for more efficient retries
     *
     * @param attempt - Current attempt number (starting from 1)
     * @param initialDelay - Initial delay in ms
     * @param maxDelay - Maximum delay in ms
     * @returns Delay in ms
     */
    static calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number;
    /**
     * Default retry condition based on error type
     *
     * @param error - Error to check
     * @returns True if error is retryable
     */
    static defaultRetryCondition(error: ExtendedError): boolean;
    /**
     * Promise-based delay
     *
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after the specified delay
     */
    static delay(ms: number): Promise<void>;
}
export {};
//# sourceMappingURL=retry-helper.d.ts.map