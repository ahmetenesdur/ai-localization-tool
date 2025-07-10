const RetryHelper = require("../utils/retry-helper");
const rateLimiter = require("../utils/rate-limiter");

class FallbackProvider {
	constructor(providers) {
		this.providers = providers;
		this.currentIndex = 0;
		this.providerStats = new Map(); // Track success/failure stats
		this.maxRetries = 2; // Maximum number of retries per provider

		// Success rate based automatic re-ranking
		this.reRankInterval = 10; // Re-rank providers every N operations
		this.operationCount = 0;
		this.lastErrorTime = null;
		this.consecutiveErrors = 0;

		// Initialize stats for all providers
		this.providers.forEach((provider) => {
			const providerName = this._getProviderName(provider);
			this.providerStats.set(providerName, {
				success: 0,
				failure: 0,
				avgResponseTime: 0,
				totalTime: 0,
				lastSuccess: null,
				consecutiveFailures: 0,
				lastError: null,
				disabled: false,
				disabledUntil: null,
			});
		});
	}

	_calculatePriority(text) {
		if (!text) return 1;
		if (text.length < 100) return 2; // Higher priority for shorter texts
		if (text.length > 800) return 0; // Lower priority for very long texts
		return 1;
	}

	async translate(text, sourceLang, targetLang, options) {
		const errors = [];
		const startTime = Date.now();
		const startIndex = this.currentIndex;
		let currentAttempt = 0;

		// Before translation, ensure we're using the best provider order
		this._checkAndReRankProviders();

		// Get available providers (not disabled)
		const availableProviders = this.providers.filter(
			(_, index) => !this._isProviderDisabled(this.providers[index])
		);

		if (availableProviders.length === 0) {
			// If all providers are disabled, reset and try all again
			this._resetDisabledProviders();
			availableProviders.push(...this.providers);
		}

		const totalProviders = availableProviders.length;
		const maxAttempts = totalProviders * (this.maxRetries + 1);

		while (currentAttempt < maxAttempts) {
			// Get the appropriate provider, checking if it's disabled first
			let currentProviderIndex = this.currentIndex % totalProviders;
			let providerData = availableProviders[currentProviderIndex];
			const providerName = this._getProviderName(providerData);
			const currentProvider = providerData.implementation;

			// Update operation count
			this.operationCount++;

			try {
				// Update stats for this provider
				if (!this.providerStats.has(providerName)) {
					this.providerStats.set(providerName, {
						success: 0,
						failure: 0,
						avgResponseTime: 0,
						totalTime: 0,
						lastSuccess: null,
						consecutiveFailures: 0,
					});
				}

				// Attempt translation with retry helper and rate limiting
				const providerStartTime = Date.now();
				const result = await rateLimiter.enqueue(
					providerName.toLowerCase(),
					() =>
						RetryHelper.withRetry(
							// The operation to perform
							() => currentProvider.translate(text, sourceLang, targetLang, options),
							{
								// Only retry once at this level, since we have our own fallback logic
								maxRetries: 0,
								context: `Fallback:${providerName}`,
								logContext: {
									source: sourceLang,
									target: targetLang,
									providerIndex: currentProviderIndex,
									attempt: currentAttempt + 1,
									maxAttempts,
								},
							}
						),
					this._calculatePriority(text)
				);

				const responseTime = Date.now() - providerStartTime;

				// Update success stats and response time
				const stats = this.providerStats.get(providerName);
				stats.success++;
				stats.consecutiveFailures = 0;
				stats.lastSuccess = new Date();

				// Update average response time using weighted average
				const prevTotal = stats.avgResponseTime * (stats.success + stats.failure - 1);
				stats.totalTime = prevTotal + responseTime;
				stats.avgResponseTime = stats.totalTime / (stats.success + stats.failure);

				// Reset global error tracking on success
				this.consecutiveErrors = 0;
				this.lastErrorTime = null;

				return result;
			} catch (error) {
				// Update failure stats
				if (this.providerStats.has(providerName)) {
					const stats = this.providerStats.get(providerName);
					stats.failure++;
					stats.consecutiveFailures++;
					stats.lastError = {
						time: new Date(),
						message: error.message,
					};

					// If a provider fails too many times in a row, temporarily disable it
					if (stats.consecutiveFailures >= 3) {
						this._disableProvider(providerData, 5 * 60 * 1000); // Disable for 5 minutes
					}
				}

				// Update global error tracking
				this.consecutiveErrors++;
				this.lastErrorTime = Date.now();

				errors.push({
					provider: providerName,
					error: error.message,
					attempt: currentAttempt + 1,
				});

				// SECURITY FIX: Sanitize error logging to prevent information leakage
				const safeProviderName = `Provider_${(currentProviderIndex % totalProviders) + 1}`;
				const safeErrorMessage =
					error.message.includes("API") || error.message.includes("key")
						? "Authentication or API error"
						: error.message.substring(0, 100); // Truncate long errors

				console.warn(
					`${safeProviderName} failed (attempt ${currentAttempt + 1}/${maxAttempts}): ${safeErrorMessage}`
				);

				// Move to next provider or retry current
				currentAttempt++;

				// On any failure, move to the next provider. The while loop handles retries.
				this.currentIndex++;
			}
		}

		// If we've gone through all providers and retries, reset to the starting index
		this.currentIndex = startIndex;

		// All providers failed
		throw new Error(
			`All providers failed after ${maxAttempts} attempts (${Date.now() - startTime}ms):\n${JSON.stringify(errors, null, 2)}`
		);
	}

	async analyze(prompt, options = {}) {
		const errors = [];
		const startTime = Date.now();
		const savedIndex = this.currentIndex;
		let currentAttempt = 0;

		// Before analysis, ensure we're using the best provider order
		this._checkAndReRankProviders();

		// Get available providers (not disabled)
		const availableProviders = this.providers.filter(
			(provider) =>
				!this._isProviderDisabled(provider) &&
				typeof provider.implementation.analyze === "function"
		);

		if (availableProviders.length === 0) {
			// If all providers are disabled, reset and try those with analyze capability
			this._resetDisabledProviders();
			availableProviders.push(
				...this.providers.filter((p) => typeof p.implementation.analyze === "function")
			);
		}

		const totalProviders = availableProviders.length;
		if (totalProviders === 0) {
			throw new Error("No providers support analysis capability");
		}

		const maxAttempts = totalProviders * (this.maxRetries + 1);

		while (currentAttempt < maxAttempts) {
			// Get current provider (cycling through available ones)
			let currentProviderIndex = currentAttempt % totalProviders;
			let providerData = availableProviders[currentProviderIndex];
			const providerName = this._getProviderName(providerData);
			const currentProvider = providerData.implementation;

			// Update operation count
			this.operationCount++;

			try {
				// Update stats for this provider
				if (!this.providerStats.has(providerName)) {
					this.providerStats.set(providerName, {
						success: 0,
						failure: 0,
						avgResponseTime: 0,
						totalTime: 0,
						lastSuccess: null,
						consecutiveFailures: 0,
					});
				}

				// Attempt analysis with retry helper and rate limiting
				const providerStartTime = Date.now();

				const result = await rateLimiter.enqueue(
					providerName.toLowerCase(),
					() =>
						RetryHelper.withRetry(() => currentProvider.analyze(prompt, options), {
							maxRetries: 0,
							context: `Fallback:${providerName}`,
							logContext: {
								providerIndex: currentProviderIndex,
								attempt: currentAttempt + 1,
								maxAttempts,
							},
						}),
					this._calculatePriority(prompt)
				);

				const responseTime = Date.now() - providerStartTime;

				// Update success stats
				const stats = this.providerStats.get(providerName);
				stats.success++;
				stats.consecutiveFailures = 0;
				stats.lastSuccess = new Date();

				// Update average response time
				const prevTotal = stats.avgResponseTime * (stats.success + stats.failure - 1);
				stats.totalTime = prevTotal + responseTime;
				stats.avgResponseTime = stats.totalTime / (stats.success + stats.failure);

				// Reset global error tracking
				this.consecutiveErrors = 0;
				this.lastErrorTime = null;

				this.currentIndex = savedIndex; // Return to original index
				return result;
			} catch (error) {
				// Update failure stats
				if (this.providerStats.has(providerName)) {
					const stats = this.providerStats.get(providerName);
					stats.failure++;
					stats.consecutiveFailures++;
					stats.lastError = {
						time: new Date(),
						message: error.message,
					};

					// If a provider fails too many times in a row, temporarily disable it
					if (stats.consecutiveFailures >= 3) {
						this._disableProvider(providerData, 5 * 60 * 1000); // Disable for 5 minutes
					}
				}

				// Update global error tracking
				this.consecutiveErrors++;
				this.lastErrorTime = Date.now();

				errors.push({
					provider: providerName,
					error: error.message,
					attempt: currentAttempt + 1,
				});

				// SECURITY FIX: Sanitize error logging to prevent information leakage
				const safeProviderName = `Provider_${(currentProviderIndex % totalProviders) + 1}`;
				const safeErrorMessage =
					error.message.includes("API") || error.message.includes("key")
						? "Authentication or API error"
						: error.message.substring(0, 100); // Truncate long errors

				console.warn(
					`${safeProviderName} failed (attempt ${currentAttempt + 1}/${maxAttempts}): ${safeErrorMessage}`
				);

				// Move to next provider
				currentAttempt++;
				this.currentIndex++;
			}
		}

		// All providers failed, reset index and throw error
		this.currentIndex = savedIndex;
		throw new Error(
			`All providers failed for analysis after ${maxAttempts} attempts (${Date.now() - startTime}ms):\n${JSON.stringify(errors, null, 2)}`
		);
	}

	// Get provider statistics
	getStats() {
		const stats = Object.fromEntries(this.providerStats);

		// Calculate success rates and add to stats
		Object.keys(stats).forEach((provider) => {
			const providerStats = stats[provider];
			const total = providerStats.success + providerStats.failure;
			providerStats.successRate = total > 0 ? providerStats.success / total : 0;
			providerStats.totalCalls = total;
			providerStats.avgResponseTimeMs = Math.round(providerStats.avgResponseTime);

			// Add disabled status
			const isDisabled = this._isProviderDisabled(
				this.providers.find((p) => this._getProviderName(p) === provider)
			);
			providerStats.isDisabled = isDisabled;

			if (isDisabled && providerStats.disabledUntil) {
				providerStats.enablesInMs = Math.max(0, providerStats.disabledUntil - Date.now());
			}
		});

		return stats;
	}

	// Reset the provider index
	reset() {
		this.currentIndex = 0;
		this._resetDisabledProviders();
	}

	// Reset all statistics
	resetStats() {
		this.providerStats.clear();
		this.providers.forEach((provider) => {
			const providerName = this._getProviderName(provider);
			this.providerStats.set(providerName, {
				success: 0,
				failure: 0,
				avgResponseTime: 0,
				totalTime: 0,
				lastSuccess: null,
				consecutiveFailures: 0,
				lastError: null,
				disabled: false,
				disabledUntil: null,
			});
		});
		this.operationCount = 0;
		this.consecutiveErrors = 0;
		this.lastErrorTime = null;
	}

	// Re-rank providers based on success rates
	_checkAndReRankProviders() {
		// Only re-rank occasionally
		if (this.operationCount % this.reRankInterval !== 0) {
			return;
		}

		// Calculate success rates for each provider
		const providerRanks = this.providers.map((provider, index) => {
			const name = this._getProviderName(provider);
			const stats = this.providerStats.get(name) || { success: 0, failure: 0 };
			const total = stats.success + stats.failure;

			// Calculate a score that considers success rate and response time
			let score = 0;
			if (total > 0) {
				const successRate = stats.success / total;
				const responseTimePenalty =
					stats.avgResponseTime > 0
						? Math.min(0.3, stats.avgResponseTime / 5000) // Penalty increases with response time
						: 0;

				score = successRate * (1 - responseTimePenalty);

				// Add penalty for consecutive failures
				if (stats.consecutiveFailures > 0) {
					score -= Math.min(0.5, stats.consecutiveFailures * 0.1);
				}
			}

			return { provider, index, score };
		});

		// Skip if we don't have enough data
		const hasEnoughData = providerRanks.some(
			(p) => (this.providerStats.get(this._getProviderName(p.provider))?.success || 0) > 2
		);

		if (!hasEnoughData) {
			return;
		}

		// Sort providers by score in descending order
		providerRanks.sort((a, b) => b.score - a.score);

		// Reorder providers based on ranks
		this.providers = providerRanks.map((p) => p.provider);
		this.currentIndex = 0; // Reset to start with the best provider
	}

	// Temporarily disable a provider
	_disableProvider(provider, timeoutMs = 5 * 60 * 1000) {
		const providerName = this._getProviderName(provider);
		const stats = this.providerStats.get(providerName);
		if (stats) {
			stats.disabled = true;
			stats.disabledUntil = Date.now() + timeoutMs;

			// Schedule re-enabling
			setTimeout(() => {
				stats.disabled = false;
				stats.disabledUntil = null;
				console.log(`Re-enabled provider: ${providerName}`);
			}, timeoutMs);

			console.log(
				`Temporarily disabled provider ${providerName} for ${timeoutMs / 1000}s due to failures`
			);
		}
	}

	// Check if a provider is currently disabled
	_isProviderDisabled(provider) {
		if (!provider) return true;

		const providerName = this._getProviderName(provider);
		const stats = this.providerStats.get(providerName);

		if (!stats) return false;

		// Re-enable if the timeout has passed
		if (stats.disabled && stats.disabledUntil && Date.now() > stats.disabledUntil) {
			stats.disabled = false;
			stats.disabledUntil = null;
			return false;
		}

		return stats.disabled === true;
	}

	// Reset all disabled providers
	_resetDisabledProviders() {
		this.providerStats.forEach((stats) => {
			stats.disabled = false;
			stats.disabledUntil = null;
		});
	}

	// Get provider name consistently
	_getProviderName(provider) {
		return provider?.name || "Unknown";
	}
}

module.exports = FallbackProvider;
