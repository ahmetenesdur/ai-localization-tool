const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");

class Orchestrator {
	constructor(options) {
		this.options = options;
		this.contextProcessor = new ContextProcessor(options.context);

		// Allow progress tracker to be configured via options
		this.progress = new ProgressTracker(options.progressOptions || {});

		this.qualityChecker = new QualityChecker({
			styleGuide: options.styleGuide,
			context: options.context,
			lengthControl: options.lengthControl,
		});

		// Advanced options
		this.advanced = {
			timeoutMs: options.advanced?.timeoutMs || 60000, // Default 60 seconds
			maxKeyLength: options.advanced?.maxKeyLength || 10000, // Max length for a translation key
			maxBatchSize: options.advanced?.maxBatchSize || 50, // Max items per batch
			autoOptimize: options.advanced?.autoOptimize !== false, // Auto-optimize settings
			debug: options.advanced?.debug || false, // Debug mode
		};

		// Configure rate limiter
		if (options.rateLimiter) {
			rateLimiter.updateConfig({
				queueStrategy: options.rateLimiter.queueStrategy,
				queueTimeout: options.rateLimiter.queueTimeout,
				adaptiveThrottling: options.rateLimiter.adaptiveThrottling,
			});
		}

		// Enhanced cache configuration
		this.translationCache = new LRUCache({
			max: options.cacheSize || 1000,
			ttl: options.cacheTTL || 1000 * 60 * 60 * 24, // Default 24h
			updateAgeOnGet: true,
			allowStale: true,
			fetchMethod: async (key, staleValue, { context }) => {
				// This is used when a cache entry expires but is allowed to be stale
				// We'll return the stale value and asynchronously refresh it
				if (staleValue) {
					// Schedule a refresh of this translation in the background
					this._refreshCacheEntry(key, context).catch((err) => {
						console.warn(`Cache refresh failed for key ${key}: ${err.message}`);
					});
					return staleValue;
				}
				return null;
			},
		});

		this.cacheStats = {
			hits: 0,
			misses: 0,
			staleHits: 0,
			stored: 0,
			refreshes: 0,
		};

		this.concurrencyLimit = options.concurrencyLimit || 5;

		// Apply auto-optimization if enabled
		if (this.advanced.autoOptimize) {
			this._applyAutoOptimizations();
		}

		// Debug mode logging
		if (this.advanced.debug) {
			console.log("Orchestrator initialized with options:", {
				concurrencyLimit: this.concurrencyLimit,
				cacheEnabled: options.cacheEnabled !== false,
				cacheSize: options.cacheSize || 1000,
				cacheTTL: options.cacheTTL || 1000 * 60 * 60 * 24,
				rateLimiter: rateLimiter.getConfig(),
				advanced: this.advanced,
			});
		}
	}

	async processTranslation(key, text, targetLang, contextData, existingTranslation) {
		if (typeof text !== "string") return { key, translated: text, error: "Invalid input type" };

		// Validate key length to prevent issues with extremely long keys
		if (key.length > this.advanced.maxKeyLength) {
			return {
				key: key.substring(0, 100) + "...", // Truncate for error message
				translated: text,
				error: `Key exceeds maximum length of ${this.advanced.maxKeyLength} characters`,
				success: false,
			};
		}

		// More robust cache key generation with hash to handle large texts
		const cacheKey = this._generateCacheKey(text, targetLang, contextData?.category);

		// Check if we have this in cache
		if (this.options.cacheEnabled !== false && this.translationCache.has(cacheKey)) {
			const cachedResult = this.translationCache.get(cacheKey);

			// Update cache statistics
			this.cacheStats.hits++;

			try {
				// Try different methods for checking stale status
				let isStale = false;

				if (typeof this.translationCache.isStale === "function") {
					// LRU Cache v10 and earlier
					isStale = this.translationCache.isStale(cacheKey);
				} else if (typeof this.translationCache.getRemainingTTL === "function") {
					// LRU Cache v11+ approach
					const ttl = this.translationCache.getRemainingTTL(cacheKey);
					isStale = ttl !== undefined && ttl <= 0;
				} else {
					// Fallback: assume not stale
					isStale = false;
				}

				if (isStale) {
					this.cacheStats.staleHits++;
				}
			} catch (error) {
				// Ignore stale check errors - just for statistics
				if (this.advanced.debug) {
					console.warn("Cache stale check failed:", error.message);
				}
			}

			return {
				...cachedResult,
				key,
				fromCache: true,
			};
		}

		// Update cache statistics
		this.cacheStats.misses++;

		try {
			const provider = ProviderFactory.getProvider(
				this.options.apiProvider,
				this.options.useFallback !== false,
				this.options // Pass full config for fallbackOrder support
			);

			if (!provider) {
				throw new Error("Translation provider not available");
			}

			const translationContext = {
				...contextData,
				existingTranslation: existingTranslation || null,
			};

			let timeoutId = null;
			const timeoutPromise = new Promise((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error(`Translation timed out after ${this.advanced.timeoutMs}ms`));
				}, this.advanced.timeoutMs);
			});

			// Create translation promise with priority based on key importance
			const priority = this._calculatePriority(key, text);
			const translationPromise = rateLimiter.enqueue(
				this.options.apiProvider.toLowerCase(),
				() =>
					provider.translate(text, this.options.source, targetLang, {
						...this.options,
						detectedContext: translationContext,
					}),
				priority
			);

			let translated;
			try {
				translated = await Promise.race([translationPromise, timeoutPromise]);

				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
			} catch (error) {
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				throw error; // Re-throw the original error
			}

			// Apply quality checks and fixes
			const qualityResult = this.qualityChecker.validateAndFix(text, translated);
			translated = qualityResult.fixedText;

			const result = {
				key,
				translated,
				context: contextData,
				success: true,
				qualityChecks: qualityResult,
			};

			// Add result to cache if enabled
			if (this.options.cacheEnabled !== false) {
				this.translationCache.set(cacheKey, result, {
					context: {
						// Additional context for fetchMethod
						text,
						targetLang,
						contextData,
					},
				});
				this.cacheStats.stored++;
			}

			return result;
		} catch (err) {
			console.error(`Translation error - key "${key}":`, err);
			return {
				key,
				translated: text,
				error: err.message,
				success: false,
			};
		}
	}

	async processTranslations(items) {
		this.progress.start(items.length, items[0].targetLang);

		// Respect maxBatchSize setting
		const batchSize = Math.min(this.concurrencyLimit, this.advanced.maxBatchSize);
		const results = [];
		const chunks = this._chunkArray(items, batchSize);

		if (this.advanced.debug) {
			console.log(
				`Processing ${items.length} items in ${chunks.length} chunks of size ${batchSize}`
			);
		}

		for (const chunk of chunks) {
			const chunkPromises = chunk.map(async (item) => {
				try {
					const contextData = await this.contextProcessor.analyze(item.text);

					const result = await this.processTranslation(
						item.key,
						item.text,
						item.targetLang,
						contextData,
						item.existingTranslation
					);

					this.progress.increment(result.success ? "success" : "failed");
					return result;
				} catch (error) {
					console.error(`Error processing item ${item.key}:`, error);
					this.progress.increment("failed");
					return {
						key: item.key,
						translated: item.text,
						error: error.message,
						success: false,
					};
				}
			});

			const chunkResults = await Promise.all(chunkPromises);
			results.push(...chunkResults);
		}

		return results;
	}

	_chunkArray(array, chunkSize) {
		const chunks = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}

	// Calculate priority for queue (higher = more important)
	_calculatePriority(key, text) {
		// Give higher priority to shorter texts (they complete faster)
		if (text.length < 50) return 2;
		if (text.length > 500) return 0;
		return 1;
	}

	// Auto-optimize settings based on system capabilities
	_applyAutoOptimizations() {
		try {
			// Get system info via Node.js
			const os = require("os");
			const cpuCount = os.cpus().length;
			const totalMemory = os.totalmem();
			const memoryGB = Math.floor(totalMemory / (1024 * 1024 * 1024));

			// Optimize concurrency based on CPU and memory
			if (memoryGB >= 8 && cpuCount >= 4) {
				// High-end system
				this.concurrencyLimit = Math.min(10, cpuCount);
			} else if (memoryGB >= 4 && cpuCount >= 2) {
				// Mid-range system
				this.concurrencyLimit = Math.min(5, cpuCount);
			} else {
				// Low-end system
				this.concurrencyLimit = 2;
			}

			if (this.advanced.debug) {
				console.log(
					`Auto-optimized settings - CPU: ${cpuCount}, Memory: ${memoryGB}GB, Concurrency: ${this.concurrencyLimit}`
				);
			}
		} catch (error) {
			console.warn("Failed to auto-optimize settings:", error.message);
		}
	}

	clearCache() {
		this.translationCache.clear();
		this.resetCacheStats();
	}

	// Reset cache statistics
	resetCacheStats() {
		this.cacheStats = {
			hits: 0,
			misses: 0,
			staleHits: 0,
			stored: 0,
			refreshes: 0,
		};
	}

	// Get cache statistics
	getCacheStats() {
		return {
			...this.cacheStats,
			size: this.translationCache.size,
			capacity: this.translationCache.max,
			hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
		};
	}

	/**
	 * Generate a collision-resistant cache key for translation
	 */
	_generateCacheKey(text, targetLang, category = "unknown") {
		const keyParts = [text, targetLang, category, `LEN:${text.length}`];

		// For shorter texts, we can still use them directly but with hashing for consistency
		if (text.length < 100) {
			const directKey = keyParts.join(":");
			return crypto
				.createHash("sha256")
				.update(directKey, "utf8")
				.digest("hex")
				.substring(0, 32);
		}

		// For longer texts, create a secure hash with all components
		const hash = crypto
			.createHash("sha256")
			.update(keyParts.join(":"), "utf8")
			.digest("hex")
			.substring(0, 32); // Truncate for storage efficiency

		return hash;
	}

	// Background refresh of a stale cache entry
	async _refreshCacheEntry(key, context) {
		if (!context || !context.text || !context.targetLang) {
			return;
		}

		try {
			const provider = ProviderFactory.getProvider(
				this.options.apiProvider,
				this.options.useFallback !== false,
				this.options // Pass full config for fallbackOrder support
			);

			const translated = await rateLimiter.enqueue(
				this.options.apiProvider.toLowerCase(),
				() =>
					provider.translate(context.text, this.options.source, context.targetLang, {
						...this.options,
						detectedContext: context.contextData,
					})
			);

			// Get current entry to update only the translation
			const currentEntry = this.translationCache.get(key);
			if (currentEntry) {
				// Apply quality checks
				const qualityResult = this.qualityChecker.validateAndFix(context.text, translated);

				// Update cache with fresh data
				this.translationCache.set(
					key,
					{
						...currentEntry,
						translated: qualityResult.fixedText,
						qualityChecks: qualityResult,
						refreshed: new Date().toISOString(),
					},
					{ context }
				);

				this.cacheStats.refreshes++;
			}
		} catch (error) {
			console.warn(`Failed to refresh cache entry: ${error.message}`);
		}
	}

	// Get orchestrator statistics and status
	getStatus() {
		return {
			cache: this.getCacheStats(),
			rateLimiter: rateLimiter.getStatus(),
			concurrency: this.concurrencyLimit,
			advanced: this.advanced,
		};
	}
}

module.exports = Orchestrator;
