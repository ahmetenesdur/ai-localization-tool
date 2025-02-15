const TranslationCache = require("../cache");
const rateLimiter = require("../rateLimiter");
const ProviderFactory = require("./ProviderFactory");
const ProgressTracker = require("../utils/ProgressTracker");
const QualityChecker = require("../utils/QualityChecker");

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

				if (qualityResult.isModified) {
					console.log("\nTranslation fixes applied:");
					qualityResult.fixes.forEach((fix) => {
						console.log(`- ${fix.message}`);
					});

					return {
						key,
						translated: qualityResult.fixedText,
						qualityChecks: {
							originalTranslation: qualityResult.originalText,
							fixes: qualityResult.fixes,
						},
					};
				}
			}

			return { key, translated };
		} catch (err) {
			console.error(`Translation error "${key}":`, err.message);
			return { key, translated: text };
		}
	}

	detectContext(text, contextConfig) {
		if (!contextConfig.enabled) return contextConfig.default;

		const patterns = contextConfig.patterns;
		const priorityOrder = contextConfig.priority;

		for (const context of priorityOrder) {
			const pattern = new RegExp(patterns[context], "i");
			if (pattern.test(text)) return context;
		}

		return contextConfig.default;
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
