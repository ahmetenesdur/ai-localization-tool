const TranslationCache = require("../cache");
const rateLimiter = require("../rateLimiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality-checker");

class TranslationOrchestrator {
	constructor(options) {
		this.cache = new TranslationCache();
		this.options = options;
		this.progress = new ProgressTracker();
		this.qualityChecker = new QualityChecker();
	}

	async processTranslation(key, text, targetLang) {
		if (typeof text !== "string") return { key, translated: text };

		try {
			const cached = this.cache.get(
				text,
				this.options.source,
				targetLang,
				this.options
			);
			if (cached) return { key, translated: cached };

			const context = this.detectContext(text, this.options.context);

			const provider = ProviderFactory.getProvider(
				this.options.apiProvider,
				this.options.useFallback !== false
			);

			const translated = await rateLimiter.enqueue(
				this.options.apiProvider.toLowerCase(),
				() =>
					provider.translate(text, this.options.source, targetLang, {
						...this.options,
						context,
					})
			);

			this.cache.set(
				text,
				this.options.source,
				targetLang,
				this.options,
				translated
			);

			if (this.options.qualityChecks) {
				const qualityResult = this.qualityChecker.validateAndFix(
					text,
					translated,
					{
						lengthControl: this.options.lengthControl,
					}
				);

				return {
					key,
					translated: qualityResult.fixedText,
					qualityChecks: {
						originalTranslation: qualityResult.originalText,
						fixes: qualityResult.fixes,
						context: this.options.context,
						provider: this.options.apiProvider,
					},
				};
			}

			return { key, translated };
		} catch (err) {
			console.error(`Translation error for key "${key}":`, {
				error: err.message,
				context: this.options.context,
				provider: this.options.apiProvider,
				source: this.options.source,
				target: targetLang,
			});
			return { key, translated: text, error: err.message };
		}
	}

	detectContext(text, contextConfig) {
		// If no context config or disabled
		if (!contextConfig?.enabled) return "general";

		// If no context categories defined
		if (!contextConfig.categories) return "general";

		const matches = {};
		const lowerText = text.toLowerCase();

		// Check keyword matches for each category
		for (const [category, keywords] of Object.entries(
			contextConfig.categories
		)) {
			matches[category] = keywords.reduce((count, keyword) => {
				const regex = new RegExp(
					`\\b${keyword.toLowerCase()}\\b`,
					"gi"
				);
				return count + (lowerText.match(regex) || []).length;
			}, 0);
		}

		// Filter categories that exceed the threshold
		const validCategories = Object.entries(matches)
			.filter(
				([_, count]) => count >= (contextConfig.detectionThreshold || 2)
			)
			.sort((a, b) => b[1] - a[1]);

		return validCategories[0]?.[0] || "general";
	}

	async processTranslations(items) {
		this.progress.start(items.length);

		const results = [];
		for (const item of items) {
			try {
				const cached = this.cache.get(
					item.text,
					this.options.source,
					item.targetLang,
					this.options
				);
				if (cached) {
					results.push({ key: item.key, translated: cached });
					this.progress.increment("cached");
					continue;
				}

				const result = await this.processTranslation(
					item.key,
					item.text,
					item.targetLang
				);
				results.push(result);
				this.progress.increment("success");
			} catch (error) {
				results.push({ key: item.key, translated: item.text });
				this.progress.increment("failed");
			}
		}

		return results;
	}
}

module.exports = TranslationOrchestrator;
