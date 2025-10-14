/**
 * Retry helper for API operations with exponential backoff
 */

class RetryHelper {
	/**
	 * Retry an operation with configurable backoff strategy
	 */
	static async withRetry(operation, options = {}) {
		const maxRetries = options.maxRetries ?? 2;
		const initialDelay = options.initialDelay ?? 1000;
		const maxDelay = options.maxDelay ?? 10000;
		const context = options.context ?? "Operation";
		const logContext = options.logContext ?? {};
		const retryCondition = options.retryCondition ?? this.defaultRetryCondition;

		let lastError = null;
		let attempts = 0;
		const startTime = Date.now();
		const retryStats = { attempts: 0, totalTime: 0 };

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
			} catch (error) {
				attempts++;
				lastError = error;

				if (!error.retryInfo) {
					error.retryInfo = {
						attemptNumber: attempts,
						maxRetries,
						willRetry: attempts <= maxRetries,
						context: logContext,
					};
				}

				const shouldRetry =
					attempts <= maxRetries && (await retryCondition(error, attempts, maxRetries));

				if (process.env.DEBUG) {
					console.warn(
						`⚠️ ${context}: Error on attempt ${attempts}/${maxRetries + 1}: ${error.message}` +
							(error.code ? ` [${error.code}]` : "")
					);
				}
				if (shouldRetry) {
					break;
				}
			}
		}

		retryStats.totalTime = Date.now() - startTime;
		retryStats.success = false;

		if (lastError) {
			lastError.retryStats = retryStats;
			lastError.message = `${lastError.message} (after ${attempts} attempts over ${retryStats.totalTime}ms)`;
		}

		throw lastError;
	}

	/**
	 * Calculate exponential backoff with jitter
	 */
	static calculateBackoff(attempt, initialDelay, maxDelay) {
		const expBackoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt - 1));

		return Math.floor(Math.random() * expBackoff);
	}

	/**
	 * Default retry condition based on error type
	 */
	static defaultRetryCondition(error) {
		if (error.status && error.status >= 400 && error.status < 500) {
			if (error.status === 429) return true;

			if ([408, 425, 449].includes(error.status)) return true;

			return false;
		}

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

		return error.status >= 500 || !error.status;
	}

	/**
	 * Promise-based delay
	 */
	static delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

module.exports = RetryHelper;
