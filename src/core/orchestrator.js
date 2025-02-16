const TranslationCache = require("../utils/cache");
const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality-checker");

class Orchestrator {
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
				const sanitized =
					this.qualityChecker.sanitizeTranslation(translated);

				const qualityResult = this.qualityChecker.validateAndFix(
					text,
					sanitized,
					{
						lengthControl: this.options.lengthControl,
					}
				);

				return {
					key,
					translated: qualityResult.fixedText,
					qualityChecks: {
						originalTranslation: translated,
						sanitizedTranslation: sanitized,
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
		if (!contextConfig?.enabled) {
			return {
				category: contextConfig?.fallback?.category || "general",
				confidence: 1.0,
				prompt: contextConfig?.fallback?.prompt || "",
			};
		}

		const lowerText = text.toLowerCase();
		const matches = {};
		let totalScore = 0;

		// Analyze categories
		for (const [category, config] of Object.entries(
			contextConfig.categories
		)) {
			const keywordMatches = config.keywords.reduce((count, keyword) => {
				const regex = new RegExp(
					`\\b${keyword.toLowerCase()}\\b`,
					"gi"
				);
				const matches = (lowerText.match(regex) || []).length;
				return count + matches;
			}, 0);

			const weight = config.weight || 1.0;
			const score = keywordMatches * weight;

			if (keywordMatches >= (contextConfig.detection?.threshold || 2)) {
				matches[category] = {
					score,
					matches: keywordMatches,
					prompt: config.prompt,
				};
				totalScore += score;
			}
		}

		// Find best match
		const sortedMatches = Object.entries(matches)
			.map(([category, data]) => ({
				category,
				confidence: data.score / totalScore,
				prompt: data.prompt,
			}))
			.filter(
				(match) =>
					match.confidence >=
					(contextConfig.detection?.minConfidence || 0.6)
			)
			.sort((a, b) => b.confidence - a.confidence);

		return (
			sortedMatches[0] || {
				category: contextConfig.fallback.category,
				confidence: 1.0,
				prompt: contextConfig.fallback.prompt,
			}
		);
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

module.exports = Orchestrator;
