const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");
const CONSTANTS = require("../utils/constants");
const { TimeoutError, TranslationError, ErrorFactory } = require("../utils/errors");

class Orchestrator {
	constructor(options) {
		this.options = options;
		this.contextProcessor = new ContextProcessor(options.context);

		// Allow progress tracker to be configured via options
		this.progress = new ProgressTracker(options.progressOptions || {});

		// MEMORY FIX: Setup translation cache with constants
		this.cache = new LRUCache({
			max: options.cacheSize || CONSTANTS.CACHE.TRANSLATION_CACHE_SIZE,
			ttl: options.cacheTTL || CONSTANTS.CACHE.DEFAULT_TTL,
			updateAgeOnGet: true,
			allowStale: true,
		});

		// Cache stats for reporting
		this.cacheStats = {
			hits: 0,
			misses: 0,
			errors: 0,
			totalRequests: 0,
		};

		// PERFORMANCE FIX: Array operations optimization with constants
		this.batchSize = Math.min(
			options.batchSize || CONSTANTS.ORCHESTRATOR.DEFAULT_BATCH_SIZE,
			CONSTANTS.ORCHESTRATOR.MAX_BATCH_SIZE
		);

		// MEMORY FIX: Concurrency limits
		this.maxConcurrency = Math.min(
			options.maxConcurrency || CONSTANTS.ORCHESTRATOR.DEFAULT_CONCURRENCY,
			CONSTANTS.ORCHESTRATOR.MAX_CONCURRENCY
		);

		// Quality checker
		this.qualityChecker = new QualityChecker({
			styleGuide: options.styleGuide,
			context: options.context,
			lengthControl: options.lengthControl,
		});

		// Track operation statistics
		this.stats = {
			successful: 0,
			failed: 0,
			cached: 0,
			retries: 0,
			qualityRejections: 0,
			timeouts: 0,
			providerSwitches: 0,
			startTime: null,
			endTime: null,
		};

		// PERFORMANCE FIX: Connection pool limits
		this.connectionLimits = {
			maxPoolSize: options.maxPoolSize || CONSTANTS.ORCHESTRATOR.MAX_POOL_SIZE,
			keepAlive: options.keepAlive !== false,
			timeout: options.connectionTimeout || CONSTANTS.ORCHESTRATOR.CONNECTION_TIMEOUT,
		};

		// MEMORY FIX: Add cleanup intervals
		this.lastCleanup = Date.now();
		this.cleanupInterval = CONSTANTS.ORCHESTRATOR.CLEANUP_INTERVAL;
		this._scheduleCleanup();
	}

	/**
	 * MEMORY FIX: Schedule periodic cleanup to prevent memory growth
	 */
	_scheduleCleanup() {
		if (this._cleanupTimer) {
			clearInterval(this._cleanupTimer);
		}

		this._cleanupTimer = setInterval(() => {
			this._performMemoryCleanup();
		}, this.cleanupInterval);
	}

	/**
	 * MEMORY FIX: Perform memory cleanup operations
	 */
	_performMemoryCleanup() {
		const now = Date.now();

		// Only run cleanup if enough time has passed
		if (now - this.lastCleanup < this.cleanupInterval) {
			return;
		}

		try {
			// Clean cache if it's getting too large
			if (this.cache.size > this.cache.max * CONSTANTS.CACHE.UTILIZATION_THRESHOLD) {
				const toRemove = Math.floor(this.cache.size * CONSTANTS.CACHE.CLEANUP_PERCENTAGE);
				const keys = [...this.cache.keys()];
				for (let i = 0; i < toRemove && i < keys.length; i++) {
					this.cache.delete(keys[i]);
				}
			}

			this.lastCleanup = now;
		} catch (error) {
			console.warn("Memory cleanup failed:", error.message);
		}
	}

	/**
	 * Process multiple translation tasks in parallel with batching
	 */
	async processTranslations(tasks) {
		if (!Array.isArray(tasks) || tasks.length === 0) {
			return [];
		}

		this.stats.startTime = Date.now();
		this.progress.start(tasks.length, tasks[0]?.targetLang);

		try {
			// PERFORMANCE FIX: Process in batches to manage memory and connections
			const results = [];
			const batches = this._createBatches(tasks);

			for (const batch of batches) {
				const batchResults = await this._processBatch(batch);
				results.push(...batchResults);

				// MEMORY FIX: Perform cleanup between batches
				if (results.length % CONSTANTS.ORCHESTRATOR.CLEANUP_FREQUENCY === 0) {
					this._performMemoryCleanup();
				}
			}

			this.stats.endTime = Date.now();
			return results;
		} catch (error) {
			this.stats.endTime = Date.now();
			throw error;
		} finally {
			// MEMORY FIX: Final cleanup
			this._performMemoryCleanup();
		}
	}

	/**
	 * PERFORMANCE FIX: Create optimized batches based on task characteristics
	 */
	_createBatches(tasks) {
		// PERFORMANCE FIX: Use Map for O(1) grouping instead of array operations
		const languageGroups = new Map();

		for (const task of tasks) {
			const lang = task.targetLang;
			if (!languageGroups.has(lang)) {
				languageGroups.set(lang, []);
			}
			languageGroups.get(lang).push(task);
		}

		// PERFORMANCE FIX: Create balanced batches within each language
		const batches = [];
		for (const [lang, langTasks] of languageGroups) {
			// Process each language in batches
			for (let i = 0; i < langTasks.length; i += this.batchSize) {
				const batch = langTasks.slice(i, i + this.batchSize);
				batches.push(batch);
			}
		}

		return batches;
	}

	/**
	 * PERFORMANCE FIX: Process a batch with controlled concurrency
	 */
	async _processBatch(batch) {
		const semaphore = this._createSemaphore(Math.min(this.maxConcurrency, batch.length));

		const promises = batch.map((task) => {
			return semaphore(() => this._processTranslationTask(task));
		});

		return Promise.all(promises);
	}

	/**
	 * PERFORMANCE FIX: Create a semaphore for concurrency control
	 */
	_createSemaphore(maxConcurrent) {
		let currentCount = 0;
		const queue = [];

		return (task) => {
			return new Promise((resolve, reject) => {
				const run = async () => {
					currentCount++;
					try {
						const result = await task();
						resolve(result);
					} catch (error) {
						reject(error);
					} finally {
						currentCount--;
						if (queue.length > 0) {
							const next = queue.shift();
							next();
						}
					}
				};

				if (currentCount < maxConcurrent) {
					run();
				} else {
					queue.push(run);
				}
			});
		};
	}

	/**
	 * Process a single translation task
	 */
	async _processTranslationTask(task) {
		const { key, text, targetLang, existingTranslation } = task;

		try {
			this.cacheStats.totalRequests++;

			// PERFORMANCE FIX: Enhanced cache key generation
			const cacheKey = this._generateEnhancedCacheKey(text, this.options.source, targetLang);

			// Check cache first
			if (this.cache.has(cacheKey) && !this.options.forceUpdate) {
				this.cacheStats.hits++;
				this.stats.cached++;
				this.progress.increment("success");

				return {
					key,
					translated: this.cache.get(cacheKey),
					success: true,
					cached: true,
				};
			}

			this.cacheStats.misses++;

			// Get context information
			const contextInfo = await this.contextProcessor.getContext(text);

			// Attempt translation with provider fallbacks
			const translationResult = await this._translateWithFallback(
				text,
				this.options.source,
				targetLang,
				contextInfo
			);

			if (!translationResult.success) {
				this.progress.increment("failed");
				this.stats.failed++;
				return {
					key,
					success: false,
					error: translationResult.error,
				};
			}

			// Quality check
			const qualityResult = this.qualityChecker.validate(
				text,
				translationResult.translation,
				{
					...this.options,
					targetLang,
					context: contextInfo,
				}
			);

			if (!qualityResult.valid) {
				this.stats.qualityRejections++;

				// Try one more time with stricter instructions
				const retryResult = await this._translateWithFallback(
					text,
					this.options.source,
					targetLang,
					contextInfo,
					{
						strictMode: true,
						qualityHints: qualityResult.issues.map((i) => i.message),
					}
				);

				if (retryResult.success) {
					const retryQualityResult = this.qualityChecker.validate(
						text,
						retryResult.translation,
						{
							...this.options,
							targetLang,
							context: contextInfo,
						}
					);

					if (retryQualityResult.valid) {
						// Cache the successful retry
						this.cache.set(cacheKey, retryResult.translation);
						this.progress.increment("success");
						this.stats.successful++;
						this.stats.retries++;

						return {
							key,
							translated: retryResult.translation,
							success: true,
							context: contextInfo,
							retried: true,
						};
					}
				}

				// If retry also failed quality check, use original but mark as low quality
				this.progress.increment("failed");
				this.stats.failed++;
				return {
					key,
					translated: translationResult.translation,
					success: false,
					error: `Quality check failed: ${qualityResult.issues.map((i) => i.message).join(", ")}`,
					lowQuality: true,
				};
			}

			// Cache successful translation
			this.cache.set(cacheKey, translationResult.translation);
			this.progress.increment("success");
			this.stats.successful++;

			return {
				key,
				translated: translationResult.translation,
				success: true,
				context: contextInfo,
				provider: translationResult.provider,
			};
		} catch (error) {
			this.cacheStats.errors++;
			this.progress.increment("failed");
			this.stats.failed++;

			return {
				key,
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * MEMORY FIX & PERFORMANCE FIX: Enhanced cache key generation with constants
	 */
	_generateEnhancedCacheKey(text, sourceLang, targetLang) {
		// PERFORMANCE FIX: Use constants for different text length strategies
		let keyContent;

		if (text.length <= CONSTANTS.CACHE.SHORT_TEXT_CACHE_LIMIT) {
			// Short text: use full text
			keyContent = `${sourceLang}-${targetLang}-${text}`;
		} else if (text.length <= CONSTANTS.CACHE.MEDIUM_TEXT_CACHE_LIMIT) {
			// Medium text: use beginning + end + length
			const start = text.substring(0, CONSTANTS.CACHE.CACHE_SAMPLE_SIZE);
			const end = text.substring(text.length - CONSTANTS.CACHE.CACHE_SAMPLE_SIZE);
			keyContent = `${sourceLang}-${targetLang}-${start}...${end}-${text.length}`;
		} else {
			// Long text: use multiple samples
			const size = CONSTANTS.CACHE.CACHE_SAMPLE_SIZE;
			const quarter = Math.floor(text.length / 4);
			const samples = [
				text.substring(0, size),
				text.substring(quarter, quarter + size),
				text.substring(quarter * 2, quarter * 2 + size),
				text.substring(quarter * 3, quarter * 3 + size),
				text.substring(text.length - size),
			];
			keyContent = `${sourceLang}-${targetLang}-${samples.join("|")}-${text.length}`;
		}

		// MEMORY FIX: Use SHA-256 instead of MD5 and truncate to constant length
		return crypto
			.createHash("sha256")
			.update(keyContent)
			.digest("hex")
			.substring(0, CONSTANTS.CACHE.HASH_TRUNCATE_LENGTH);
	}

	/**
	 * Translate text with provider fallbacks
	 */
	async _translateWithFallback(text, sourceLang, targetLang, contextInfo, options = {}) {
		const providers = ProviderFactory.getOrderedProviders(this.options);
		let lastError = null;

		for (const providerName of providers) {
			try {
				// PERFORMANCE FIX: Add timeout wrapper with constants
				const result = await this._withTimeout(
					this._translateWithProvider(
						providerName,
						text,
						sourceLang,
						targetLang,
						contextInfo,
						options
					),
					this.options.translationTimeout || CONSTANTS.ORCHESTRATOR.TRANSLATION_TIMEOUT
				);

				return {
					success: true,
					translation: result,
					provider: providerName,
				};
			} catch (error) {
				lastError = error;

				if (error instanceof TimeoutError) {
					this.stats.timeouts++;
				}

				// Don't try fallback for certain types of errors
				if (this._isNonRetryableError(error)) {
					break;
				}

				this.stats.providerSwitches++;
				console.warn(`Provider ${providerName} failed, trying next: ${error.message}`);
			}
		}

		return {
			success: false,
			error: lastError?.message || "All providers failed",
		};
	}

	/**
	 * PERFORMANCE FIX: Timeout wrapper with proper cleanup
	 */
	async _withTimeout(promise, timeoutMs) {
		let timeoutId;

		const timeoutPromise = new Promise((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(
					new TimeoutError(
						`Operation timed out after ${timeoutMs}ms`,
						"translation",
						timeoutMs
					)
				);
			}, timeoutMs);
		});

		try {
			const result = await Promise.race([promise, timeoutPromise]);
			return result;
		} finally {
			// MEMORY FIX: Always clear timeout to prevent memory leaks
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	}

	/**
	 * Check if error should skip provider fallback
	 */
	_isNonRetryableError(error) {
		// Don't retry on authentication errors, invalid input, etc.
		return (
			error.message.includes("authentication") ||
			error.message.includes("unauthorized") ||
			error.message.includes("invalid input") ||
			error.message.includes("quota exceeded")
		);
	}

	/**
	 * Translate using specific provider
	 */
	async _translateWithProvider(providerName, text, sourceLang, targetLang, contextInfo, options) {
		const provider = ProviderFactory.getProvider(providerName, true, this.options);

		if (!provider) {
			throw new Error(`Provider ${providerName} not available`);
		}

		// Enhance options with context and quality hints
		const enhancedOptions = {
			...this.options,
			context: contextInfo,
			qualityHints: options.qualityHints,
			strictMode: options.strictMode,
		};

		// Use rate limiter to queue the translation
		return await rateLimiter.enqueue(providerName.toLowerCase(), () =>
			provider.translate(text, sourceLang, targetLang, enhancedOptions)
		);
	}

	/**
	 * Get comprehensive statistics
	 */
	getStats() {
		const totalTime = this.stats.endTime ? this.stats.endTime - this.stats.startTime : 0;

		return {
			...this.stats,
			totalTime,
			cacheStats: { ...this.cacheStats },
			hitRate:
				this.cacheStats.totalRequests > 0
					? this.cacheStats.hits / this.cacheStats.totalRequests
					: 0,
			successRate:
				this.stats.successful + this.stats.failed > 0
					? this.stats.successful / (this.stats.successful + this.stats.failed)
					: 0,
			progressSnapshot: this.progress.getStatus(),
		};
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return {
			size: this.cache.size,
			maxSize: this.cache.max,
			...this.cacheStats,
			hitRate:
				this.cacheStats.totalRequests > 0
					? (this.cacheStats.hits / this.cacheStats.totalRequests) *
						CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER
					: 0,
		};
	}

	/**
	 * Clear cache and reset stats
	 */
	clearCache() {
		this.cache.clear();
		this.cacheStats = {
			hits: 0,
			misses: 0,
			errors: 0,
			totalRequests: 0,
		};
	}

	/**
	 * MEMORY FIX: Cleanup resources when orchestrator is no longer needed
	 */
	destroy() {
		if (this._cleanupTimer) {
			clearInterval(this._cleanupTimer);
			this._cleanupTimer = null;
		}

		this.cache.clear();
		this.stats = {
			successful: 0,
			failed: 0,
			cached: 0,
			retries: 0,
			qualityRejections: 0,
			timeouts: 0,
			providerSwitches: 0,
			startTime: null,
			endTime: null,
		};
	}
}

module.exports = Orchestrator;
