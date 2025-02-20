const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");

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
	}

	async processTranslation(
		key,
		text,
		targetLang,
		contextData,
		existingTranslation
	) {
		if (typeof text !== "string")
			return { key, translated: text, error: "Invalid input type" };

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

			let translated = await rateLimiter.enqueue(
				this.options.apiProvider.toLowerCase(),
				() =>
					provider.translate(text, this.options.source, targetLang, {
						...this.options,
						detectedContext: translationContext,
					})
			);

			// Apply quality checks and fixes
			const qualityResult = this.qualityChecker.validateAndFix(
				text,
				translated
			);
			translated = qualityResult.fixedText;

			return {
				key,
				translated,
				context: contextData,
				success: true,
				qualityChecks: qualityResult,
			};
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
		for (const item of items) {
			try {
				const contextData = this.contextProcessor.analyze(item.text);
				const result = await this.processTranslation(
					item.key,
					item.text,
					item.targetLang,
					contextData,
					item.existingTranslation
				);
				results.push(result);
				this.progress.increment(result.success ? "success" : "failed");
			} catch (error) {
				results.push({ key: item.key, translated: item.text });
				this.progress.increment("failed");
			}
		}

		return results;
	}
}

module.exports = Orchestrator;
