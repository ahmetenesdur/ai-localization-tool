const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");
const { LRUCache } = require("lru-cache");

class Orchestrator {
	constructor(options) {
		this.options = options;
		this.contextProcessor = new ContextProcessor(options.context);
		this.progress = new ProgressTracker();
		this.qualityChecker = new QualityChecker({
			styleGuide: options.styleGuide,
			context: options.context,
			lengthControl: options.lengthControl,
		});

		this.translationCache = new LRUCache({
			max: 1000,
			ttl: 1000 * 60 * 60 * 24,
		});

		this.concurrencyLimit = options.concurrencyLimit || 5;
	}

	async processTranslation(key, text, targetLang, contextData, existingTranslation) {
		if (typeof text !== "string") return { key, translated: text, error: "Invalid input type" };

		const cacheKey = `${text}:${targetLang}:${contextData?.category || "unknown"}`;

		if (this.translationCache.has(cacheKey)) {
			const cachedResult = this.translationCache.get(cacheKey);
			return {
				...cachedResult,
				key,
				fromCache: true,
			};
		}

		try {
			const provider = ProviderFactory.getProvider(
				this.options.apiProvider,
				this.options.useFallback !== false
			);

			if (!provider) {
				throw new Error("Translation provider not available");
			}

			const translationContext = {
				...contextData,
				existingTranslation: existingTranslation || null,
			};

			let translated = await rateLimiter.enqueue(this.options.apiProvider.toLowerCase(), () =>
				provider.translate(text, this.options.source, targetLang, {
					...this.options,
					detectedContext: translationContext,
				})
			);

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

			this.translationCache.set(cacheKey, result);

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

		const results = [];
		const chunks = this._chunkArray(items, this.concurrencyLimit);

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

	clearCache() {
		this.translationCache.clear();
	}
}

module.exports = Orchestrator;
