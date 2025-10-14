const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");
const gracefulShutdown = require("../utils/graceful-shutdown");

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

		this.advanced = {
			timeoutMs: options.advanced?.timeoutMs || 30000,
			maxKeyLength: options.advanced?.maxKeyLength || 10000,
			maxBatchSize: options.advanced?.maxBatchSize || 50,
			autoOptimize: options.advanced?.autoOptimize !== false,
			debug: options.advanced?.debug || false,
		};

		if (options.rateLimiter) {
			rateLimiter.updateConfig({
				queueStrategy: options.rateLimiter.queueStrategy,
				queueTimeout: options.rateLimiter.queueTimeout,
				adaptiveThrottling: options.rateLimiter.adaptiveThrottling,
				providerLimits: options.rateLimiter.providerLimits,
			});
		}

		this.translationCache = new LRUCache({
			max: options.cacheSize || 1000,
			ttl: options.cacheTTL || 1000 * 60 * 60 * 24,
			updateAgeOnGet: true,
			allowStale: true,
			fetchMethod: async (key, staleValue, { context }) => {
				if (staleValue) {
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

		if (this.advanced.autoOptimize) {
			this._applyAutoOptimizations();
		}

		this._shutdownCallback = async () => {
			if (this.translationCache && this.translationCache.size > 0) {
				console.log(`Flushing ${this.translationCache.size} cache entries...`);
				this.translationCache.clear();
			}
			this.resetCacheStats();
		};
		gracefulShutdown.registerCallback(this._shutdownCallback);

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

		if (key.length > this.advanced.maxKeyLength) {
			return {
				key: key.substring(0, 100) + "...",
				translated: text,
				error: `Key exceeds maximum length of ${this.advanced.maxKeyLength} characters`,
				success: false,
			};
		}

		const cacheKey = this._generateCacheKey(text, targetLang, contextData?.category);

		if (this.options.cacheEnabled !== false && this.translationCache?.has?.(cacheKey)) {
			const cachedResult = this.translationCache.get(cacheKey);

			if (!cachedResult || typeof cachedResult !== "object") {
				this.cacheStats.misses++;
				this.translationCache.delete(cacheKey);
			} else {
				this.cacheStats.hits++;

				try {
					const ttl = this.translationCache.getRemainingTTL?.(cacheKey);
					if (typeof ttl === "number" && ttl <= 0) {
						this.cacheStats.staleHits++;
					}
				} catch (error) {}

				return {
					...cachedResult,
					key,
					fromCache: true,
				};
			}
		}

		this.cacheStats.misses++;

		try {
			const provider = ProviderFactory.getProvider(
				this.options?.apiProvider,
				this.options?.useFallback !== false,
				this.options
			);

			if (!provider || typeof provider.translate !== "function") {
				throw new Error(
					`Translation provider not available or invalid: ${this.options?.apiProvider || "unknown"}`
				);
			}

			const translationContext = {
				...contextData,
				existingTranslation: existingTranslation || null,
			};

			let translated = await provider.translate(text, this.options.source, targetLang, {
				...this.options,
				detectedContext: translationContext,
			});

			const qualityResult = this.qualityChecker.validateAndFix(text, translated);
			translated = qualityResult.fixedText;

			const result = {
				key,
				translated,
				context: contextData,
				success: true,
				qualityChecks: qualityResult,
			};

			if (this.options.cacheEnabled !== false) {
				this.translationCache.set(cacheKey, result, {
					context: {
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

		const batchSize = Math.min(this.concurrencyLimit, this.advanced.maxBatchSize);
		const results = [];
		const chunks = this._chunkArray(items, batchSize);

		console.log(
			`🔄 Processing ${items.length} items in ${chunks.length} batches of max ${batchSize} items each`
		);

		if (this.advanced.debug) {
			console.log(
				`Processing ${items.length} items in ${chunks.length} chunks of size ${batchSize}`
			);
		}

		console.log(""); // Empty line for progress bar

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			if (this.advanced.debug) {
				console.log(
					`📦 Processing batch ${i + 1}/${chunks.length} (${chunk.length} items)`
				);
			}

			const texts = chunk.map((item) => item.text);
			const contextResults = await this.contextProcessor.analyzeBatch(texts);

			for (let index = 0; index < chunk.length; index++) {
				const item = chunk[index];
				try {
					const contextData =
						contextResults[index] || (await this.contextProcessor.analyze(item.text));

					const result = await this.processTranslation(
						item.key,
						item.text,
						item.targetLang,
						contextData,
						item.existingTranslation
					);

					this.progress.increment(result.success ? "success" : "failed");
					results.push(result);
				} catch (error) {
					if (this.advanced.debug) {
						console.error(`Error processing item ${item.key}:`, error);
					}
					this.progress.increment("failed");
					results.push({
						key: item.key,
						translated: item.text,
						error: error.message,
						success: false,
					});
				}
			}

			if (i < chunks.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
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

	_applyAutoOptimizations() {
		try {
			const os = require("os");
			const cpuCount = os.cpus().length;
			const totalMemory = os.totalmem();
			const memoryGB = Math.floor(totalMemory / (1024 * 1024 * 1024));

			if (memoryGB >= 8 && cpuCount >= 4) {
				this.concurrencyLimit = Math.min(10, cpuCount);
			} else if (memoryGB >= 4 && cpuCount >= 2) {
				this.concurrencyLimit = Math.min(5, cpuCount);
			} else {
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

	resetCacheStats() {
		this.cacheStats = {
			hits: 0,
			misses: 0,
			staleHits: 0,
			stored: 0,
			refreshes: 0,
		};
	}

	getCacheStats() {
		return {
			...this.cacheStats,
			size: this.translationCache.size,
			capacity: this.translationCache.max,
			hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
		};
	}

	/**
	 * Generate cache key
	 */
	_generateCacheKey(text, targetLang, category = "unknown") {
		if (text.length < 50) {
			return `${targetLang}:${category}:${text.length}:${text.slice(0, 30)}`;
		}

		const keyData = `${text}:${targetLang}:${category}:${text.length}`;

		return crypto.createHash("md5").update(keyData, "utf8").digest("hex").substring(0, 24);
	}

	async _refreshCacheEntry(key, context) {
		if (!context || !context.text || !context.targetLang) {
			return;
		}

		try {
			const provider = ProviderFactory.getProvider(
				this.options.apiProvider,
				this.options.useFallback !== false,
				this.options
			);

			const translated = await provider.translate(
				context.text,
				this.options.source,
				context.targetLang,
				{
					...this.options,
					detectedContext: context.contextData,
				}
			);

			// Get current entry to update only the translation
			const currentEntry = this.translationCache.get(key);
			if (currentEntry) {
				const qualityResult = this.qualityChecker.validateAndFix(context.text, translated);

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

	getStatus() {
		return {
			cache: this.getCacheStats(),
			rateLimiter: rateLimiter.getStatus(),
			concurrency: this.concurrencyLimit,
			advanced: this.advanced,
		};
	}

	/**
	 * Cleanup method to prevent memory leaks
	 */
	destroy() {
		if (this.translationCache) {
			this.translationCache.clear();
		}

		this.resetCacheStats();

		if (this._shutdownCallback) {
			gracefulShutdown.unregisterCallback(this._shutdownCallback);
			this._shutdownCallback = null;
		}

		this.translationCache = null;
		this.contextProcessor = null;
		this.progress = null;
		this.qualityChecker = null;
	}
}

module.exports = Orchestrator;
