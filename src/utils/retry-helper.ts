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
	retryCondition?: (
		error: any,
		attempts: number,
		maxRetries: number
	) => Promise<boolean> | boolean;
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
	static async withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
		const maxRetries = options.maxRetries ?? 2;
		const initialDelay = options.initialDelay ?? 1000;
		const maxDelay = options.maxDelay ?? 10000;
		const context = options.context ?? "Operation";
		const logContext = options.logContext ?? {};
		const retryCondition = options.retryCondition ?? this.defaultRetryCondition;

		let lastError: ExtendedError | null = null;
		let attempts = 0;
		const startTime = Date.now();
		const retryStats: RetryStats = { attempts: 0, totalTime: 0 };

		while (attempts <= maxRetries) {
			try {
				retryStats.attempts = attempts;

				if (attempts > 0) {
					const delay = this.calculateBackoff(attempts, initialDelay, maxDelay);
					if (process.env.DEBUG) {
						console.log(
							`🔄 ${context}: Retrying attempt ${attempts}/${maxRetries} after ${delay}ms delay`
						);
					}
					await this.delay(delay);
				}

				const result = await operation();

				// Track time if this was a retry
				if (attempts > 0) {
					retryStats.totalTime = Date.now() - startTime;
					retryStats.success = true;

					if (process.env.DEBUG) {
						console.log(
							`✅ ${context}: Succeeded after ${attempts} retries (${retryStats.totalTime}ms)`
						);
					}
				}

				return result;
			} catch (error: any) {
				attempts++;
				lastError = error;

				// Extend the error with additional context
				if (!error.retryInfo) {
					error.retryInfo = {
						attemptNumber: attempts,
						maxRetries,
						willRetry: attempts <= maxRetries,
						context: logContext,
					};
				}

				// Check if this error is retryable
				const shouldRetry =
					attempts <= maxRetries && (await retryCondition(error, attempts, maxRetries));

				if (shouldRetry) {
					// Log retry attempt if debug enabled
					if (process.env.DEBUG) {
						console.warn(
							`⚠️ ${context}: Error on attempt ${attempts}/${maxRetries + 1}: ${error.message}` +
								(error.code ? ` [${error.code}]` : "")
						);
					}
				} else {
					// Error is not retryable or max retries reached
					break;
				}
			}
		}

		// All retries failed
		retryStats.totalTime = Date.now() - startTime;
		retryStats.success = false;

		if (lastError) {
			lastError.retryStats = retryStats;
			lastError.message = `${lastError.message} (after ${attempts} attempts over ${retryStats.totalTime}ms)`;
		}

		throw lastError;
	}

	/**
	 * Calculate exponential backoff with jitter for more efficient retries
	 *
	 * @param attempt - Current attempt number (starting from 1)
	 * @param initialDelay - Initial delay in ms
	 * @param maxDelay - Maximum delay in ms
	 * @returns Delay in ms
	 */
	static calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
		// Full jitter exponential backoff:
		// https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
		const expBackoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt - 1));

		// Add jitter - random value between 0 and expBackoff
		return Math.floor(Math.random() * expBackoff);
	}

	/**
	 * Default retry condition based on error type
	 *
	 * @param error - Error to check
	 * @returns True if error is retryable
	 */
	static defaultRetryCondition(error: ExtendedError): boolean {
		// Don't retry on client errors (4xx) except specific cases
		if (error.status && error.status >= 400 && error.status < 500) {
			// Rate limit errors should be retried
			if (error.status === 429) return true;

			// Certain 4xx errors are retryable
			if ([408, 425, 449].includes(error.status)) return true;

			return false;
		}

		// Retry on network errors
		if (
			error.code === "ECONNRESET" ||
			error.code === "ETIMEDOUT" ||
			error.code === "ECONNREFUSED" ||
			error.code === "ENOTFOUND" ||
			error.message?.includes("network") ||
			error.message?.includes("timeout") ||
			error.message?.includes("connection")
		) {
			return true;
		}

		// By default, retry server errors
		return (error.status ?? 0) >= 500 || !error.status;
	}

	/**
	 * Promise-based delay
	 *
	 * @param ms - Milliseconds to delay
	 * @returns Promise that resolves after the specified delay
	 */
	static delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
