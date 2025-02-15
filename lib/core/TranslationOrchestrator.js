const TranslationCache = require("../cache");
const rateLimiter = require("../rateLimiter");
const ProviderFactory = require("./providerFactory");
const ProgressTracker = require("../utils/progressTracker");
const QualityChecker = require("../utils/qualityChecker");

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
					translated
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
		if (!contextConfig.enabled) return contextConfig.default;

		const patterns = contextConfig.patterns;
		const priorityOrder = contextConfig.priority;
		const matchedContexts = [];

		// Tüm eşleşen bağlamları bul
		for (const context of priorityOrder) {
			const pattern = new RegExp(patterns[context], "i");
			if (pattern.test(text)) {
				matchedContexts.push(context);
			}
		}

		if (matchedContexts.length === 0) {
			return contextConfig.default;
		}

		if (matchedContexts.length === 1) {
			return matchedContexts[0];
		}

		// Birden fazla bağlam eşleşmesi varsa
		const combinationKey = matchedContexts.sort().join("+");
		if (contextConfig.contextRules?.combinationPriority?.[combinationKey]) {
			return contextConfig.contextRules.combinationPriority[
				combinationKey
			];
		}

		// Kombinasyon kuralı yoksa, öncelik sırasına göre ilk eşleşeni döndür
		return matchedContexts[0];
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
