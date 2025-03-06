class RetryHelper {
	static async withRetry(operation, options = {}) {
		const {
			maxRetries = 2,
			initialDelay = 1000,
			shouldRetry = (err) => {
				// Default check for common errors
				const isRateLimitError = err.response?.status === 429;
				const isServerError = err.response?.status >= 500;
				const isNetworkError = !err.response;
				return isRateLimitError || isServerError || isNetworkError;
			},
			onRetry = (err, attempt, delay, context) => {
				console.warn(
					`[${context}] Retrying after ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries}): ${err.message}`
				);
			},
			context = "API",
			logContext = {},
		} = options;

		let retries = 0;
		let lastError = null;

		while (retries <= maxRetries) {
			try {
				return await operation();
			} catch (err) {
				lastError = err;

				if (shouldRetry(err) && retries < maxRetries) {
					// Calculate delay with exponential backoff and random jitter
					const delay = initialDelay * Math.pow(2, retries) * (0.8 + Math.random() * 0.4);

					// Log retry information
					onRetry(err, retries + 1, delay, context);

					// Wait for the calculated delay
					await new Promise((resolve) => setTimeout(resolve, delay));
					retries++;
					continue;
				}

				// Log detailed error information
				console.error(`[${context}] Error:`, {
					error: err.response?.data || err.message,
					status: err.response?.status,
					...logContext,
				});

				throw err;
			}
		}

		throw lastError;
	}
}

module.exports = RetryHelper;
