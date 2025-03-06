const axios = require("axios");
const ProviderFactory = require("../core/provider-factory");
const rateLimiter = require("./rate-limiter");
const { LRUCache } = require("lru-cache");

class AIContextAnalyzer {
	constructor(config) {
		this.config = config;
		this.cache = new LRUCache({
			max: 500,
			ttl: 1000 * 60 * 60 * 24,
			allowStale: true,
		});
	}

	async analyzeContext(text, apiProvider = "openai") {
		if (!text || text.length < this.config.minTextLength || !this.config.enabled) {
			return null;
		}

		const cacheKey = this._getCacheKey(text);
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey);
		}

		try {
			const provider = ProviderFactory.getProvider(apiProvider, true);

			if (!provider) {
				throw new Error("AI provider not available for context analysis");
			}

			const analysisPrompt = this._createAnalysisPrompt(text);

			const result = await rateLimiter.enqueue(apiProvider.toLowerCase(), () =>
				provider.analyze(analysisPrompt, this.config.analysisOptions)
			);

			const contextData = this._parseAnalysisResult(result);

			if (contextData) {
				this.cache.set(cacheKey, contextData);
			}

			return contextData;
		} catch (error) {
			console.error("AI context analysis error:", error.message);
			return null;
		}
	}

	_createAnalysisPrompt(text) {
		const categories = Object.keys(this.config.categories).join(", ");

		const maxTextLength = 1500;
		const truncatedText =
			text.length > maxTextLength ? text.substring(0, maxTextLength) + "..." : text;

		return `
TASK: Analyze the following text and determine its context category.

TEXT TO ANALYZE:
"""
${truncatedText}
"""

AVAILABLE CATEGORIES: ${categories}, or suggest a new category if none of these fit.

INSTRUCTIONS:
1. Identify the primary context category of the text
2. Provide a confidence score (0.0-1.0)
3. Suggest 3-5 keywords that are relevant to this text
4. Provide a brief explanation of your categorization

FORMAT YOUR RESPONSE AS JSON:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "explanation": "Brief explanation of why this category was chosen"
}
`;
	}

	_parseAnalysisResult(result) {
		try {
			const jsonMatch = result.match(/\{[\s\S]*?\}/);
			if (!jsonMatch) {
				throw new Error("No valid JSON found in AI response");
			}

			let analysisData;
			try {
				analysisData = JSON.parse(jsonMatch[0]);
			} catch (jsonError) {
				const cleanedJson = jsonMatch[0]
					.replace(/,\s*}/g, "}")
					.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
				analysisData = JSON.parse(cleanedJson);
			}

			if (!analysisData.category || typeof analysisData.confidence !== "number") {
				throw new Error("Invalid analysis data structure");
			}

			let category = analysisData.category.toLowerCase().trim();

			if (!this.config.categories[category] && this.config.allowNewCategories) {
				this._saveNewCategory(category, analysisData.keywords || []);
			} else if (!this.config.categories[category]) {
				category = this._findClosestCategory(category, analysisData.keywords || []);
			}

			return {
				category,
				confidence: analysisData.confidence,
				keywords: analysisData.keywords || [],
				explanation: analysisData.explanation || "No explanation provided",
				prompt: this.config.categories[category]?.prompt || this.config.fallback.prompt,
			};
		} catch (error) {
			console.error("Error parsing AI analysis result:", error.message);
			return null;
		}
	}

	_findClosestCategory(suggestedCategory, keywords) {
		let bestMatch = this.config.fallback.category;
		let highestScore = 0;

		for (const [category, config] of Object.entries(this.config.categories)) {
			let score = 0;

			const configKeywordsLower = new Set(config.keywords.map((k) => k.toLowerCase()));

			for (const keyword of keywords) {
				const keywordLower = keyword.toLowerCase();
				if (configKeywordsLower.has(keywordLower)) {
					score += 1.5;
					continue;
				}

				for (const configKeyword of configKeywordsLower) {
					if (
						configKeyword.includes(keywordLower) ||
						keywordLower.includes(configKeyword)
					) {
						score += 1;
						break;
					}
				}
			}

			if (category.includes(suggestedCategory) || suggestedCategory.includes(category)) {
				score += 2;
			}

			if (score > highestScore) {
				highestScore = score;
				bestMatch = category;
			}
		}

		return bestMatch;
	}

	_saveNewCategory(category, keywords) {
		if (!this.config.categories[category]) {
			this.config.categories[category] = {
				keywords: keywords,
				prompt: `Translate with awareness of ${category} context`,
				weight: 1.0,
			};

			console.log(`Added new context category: ${category}`);
		}
	}

	_getCacheKey(text) {
		if (text.length > 100) {
			const start = text.substring(0, 30);
			const middle = text.substring(
				Math.floor(text.length / 2) - 15,
				Math.floor(text.length / 2) + 15
			);
			const end = text.substring(text.length - 30);
			text = start + middle + end;
		}

		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return hash.toString();
	}
}

module.exports = AIContextAnalyzer;
