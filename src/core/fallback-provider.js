const RetryHelper = require("../utils/retry-helper");

class FallbackProvider {
	constructor(providers) {
		this.providers = providers;
		this.currentIndex = 0;
		this.providerStats = new Map(); // Track success/failure stats
		this.maxRetries = 2; // Maximum number of retries per provider
	}

	async translate(text, sourceLang, targetLang, options) {
		const errors = [];
		const startIndex = this.currentIndex;
		let currentAttempt = 0;
		const totalProviders = this.providers.length;
		const maxAttempts = totalProviders * (this.maxRetries + 1);

		while (currentAttempt < maxAttempts) {
			const currentProvider = this.providers[this.currentIndex];
			const providerName = currentProvider.constructor?.name || "Unknown";

			try {
				// Update stats for this provider
				if (!this.providerStats.has(providerName)) {
					this.providerStats.set(providerName, { success: 0, failure: 0 });
				}

				// Attempt translation with retry helper
				const result = await RetryHelper.withRetry(
					// The operation to perform
					() => currentProvider.translate(text, sourceLang, targetLang, options),
					{
						// Only retry once at this level, since we have our own fallback logic
						maxRetries: 0,
						context: `Fallback:${providerName}`,
						logContext: {
							source: sourceLang,
							target: targetLang,
							providerIndex: this.currentIndex,
							attempt: currentAttempt + 1,
							maxAttempts,
						},
					}
				);

				// Update success stats
				const stats = this.providerStats.get(providerName);
				stats.success++;

				return result;
			} catch (error) {
				// Update failure stats
				if (this.providerStats.has(providerName)) {
					const stats = this.providerStats.get(providerName);
					stats.failure++;
				}

				errors.push({
					provider: providerName,
					error: error.message,
				});

				// Log the error
				console.warn(
					`Provider ${providerName} failed (attempt ${currentAttempt + 1}/${maxAttempts}): ${error.message}`
				);

				// Move to next provider or retry current
				currentAttempt++;

				// If we've tried all retries for current provider, move to next
				if (currentAttempt % (this.maxRetries + 1) === 0) {
					this.currentIndex = (this.currentIndex + 1) % totalProviders;
				}
			}
		}

		// If we've gone through all providers and retries, reset to the starting index
		this.currentIndex = startIndex;

		// All providers failed
		throw new Error(
			`All providers failed after ${maxAttempts} attempts:\n${JSON.stringify(errors, null, 2)}`
		);
	}

	async analyze(prompt, options = {}) {
		const errors = [];
		const savedIndex = this.currentIndex;
		let currentAttempt = 0;
		const totalProviders = this.providers.length;
		const maxAttempts = totalProviders * (this.maxRetries + 1);

		while (currentAttempt < maxAttempts) {
			const currentProvider = this.providers[this.currentIndex];
			const providerName = currentProvider.constructor?.name || "Unknown";

			try {
				// Check if the provider has an analyze method
				if (typeof currentProvider.analyze !== "function") {
					console.warn(
						`Provider ${providerName} does not support analysis, trying next...`
					);
					this.currentIndex = (this.currentIndex + 1) % totalProviders;
					continue;
				}

				// Update stats for this provider
				if (!this.providerStats.has(providerName)) {
					this.providerStats.set(providerName, { success: 0, failure: 0 });
				}

				// Attempt analysis with retry helper
				const result = await RetryHelper.withRetry(
					// The operation to perform
					() => currentProvider.analyze(prompt, options),
					{
						// Only retry once at this level, since we have our own fallback logic
						maxRetries: 0,
						context: `Fallback:${providerName}`,
						logContext: {
							providerIndex: this.currentIndex,
							attempt: currentAttempt + 1,
							maxAttempts,
						},
					}
				);

				// Update success stats
				const stats = this.providerStats.get(providerName);
				stats.success++;

				this.currentIndex = savedIndex; // Return to original index
				return result;
			} catch (error) {
				// Update failure stats
				if (this.providerStats.has(providerName)) {
					const stats = this.providerStats.get(providerName);
					stats.failure++;
				}

				errors.push({
					provider: providerName,
					error: error.message,
				});

				// Log the error
				console.warn(
					`Provider ${providerName} analysis failed (attempt ${currentAttempt + 1}/${maxAttempts}): ${error.message}`
				);

				// Move to next provider or retry current
				currentAttempt++;

				// If we've tried all retries for current provider, move to next
				if (currentAttempt % (this.maxRetries + 1) === 0) {
					this.currentIndex = (this.currentIndex + 1) % totalProviders;
				}
			}
		}

		// All providers failed, reset index and throw error
		this.currentIndex = savedIndex;
		throw new Error(
			`All providers failed for analysis after ${maxAttempts} attempts:\n${JSON.stringify(errors, null, 2)}`
		);
	}

	// Get provider statistics
	getStats() {
		return Object.fromEntries(this.providerStats);
	}

	// Reset the provider index
	reset() {
		this.currentIndex = 0;
	}

	// Reset all statistics
	resetStats() {
		this.providerStats.clear();
	}
}

module.exports = FallbackProvider;
