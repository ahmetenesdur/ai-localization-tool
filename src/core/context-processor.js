const crypto = require("crypto");

class ContextProcessor {
	constructor(config) {
		this.config = config;
		this.keywordCache = new Map();
		this.initializeKeywords();
	}

	initializeKeywords() {
		for (const [category, config] of Object.entries(
			this.config.categories
		)) {
			const pattern = config.keywords
				.map((keyword) => keyword.toLowerCase())
				.join("|");

			this.keywordCache.set(category, {
				regex: new RegExp(`\\b(${pattern})\\b`, "gi"),
				weight: config.weight || 1.0,
				prompt: config.prompt,
			});
		}
	}

	analyze(text) {
		if (!this.config.enabled) {
			return this.getFallback();
		}

		const lowerText = text.toLowerCase();
		const results = new Map();
		let totalScore = 0;

		for (const [category, config] of this.keywordCache.entries()) {
			const matches = lowerText.match(config.regex) || [];

			if (matches.length >= this.config.detection.threshold) {
				const score = matches.length * config.weight;
				results.set(category, {
					score,
					matches: matches.length,
					prompt: config.prompt,
				});
				totalScore += score;
			}
		}

		return this.getBestMatch(results, totalScore);
	}

	getBestMatch(results, totalScore) {
		if (totalScore === 0) return this.getFallback();

		const bestMatches = Array.from(results.entries())
			.map(([category, data]) => ({
				category,
				confidence: data.score / totalScore,
				prompt: data.prompt,
				matches: data.matches,
			}))
			.filter(
				(match) =>
					match.confidence >= this.config.detection.minConfidence
			)
			.sort((a, b) => b.confidence - a.confidence);

		return bestMatches[0] || this.getFallback();
	}

	getFallback() {
		return {
			category: this.config.fallback.category,
			confidence: 1.0,
			prompt: this.config.fallback.prompt,
			matches: 0,
		};
	}

	getCacheKey(text, context) {
		return crypto
			.createHash("md5")
			.update(`${text}-${JSON.stringify(context)}`)
			.digest("hex");
	}
}

module.exports = ContextProcessor;
