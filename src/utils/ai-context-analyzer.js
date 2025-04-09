const axios = require("axios");
const ProviderFactory = require("../core/provider-factory");
const rateLimiter = require("./rate-limiter");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");

class AIContextAnalyzer {
	constructor(config) {
		this.config = config;
		this.cache = new LRUCache({
			max: config.cacheSize || 500,
			ttl: config.cacheTTL || 1000 * 60 * 60 * 24,
			updateAgeOnGet: true,
			allowStale: true,
		});

		this.categoryKeywords = {};
		if (config.categories) {
			Object.entries(config.categories).forEach(([category, data]) => {
				if (data.keywords && Array.isArray(data.keywords)) {
					this.categoryKeywords[category] = new Set(
						data.keywords.map((k) => k.toLowerCase())
					);
				}
			});
		}

		this.stats = {
			totalAnalyzed: 0,
			aiCalls: 0,
			cacheHits: 0,
			keywordMatches: 0,
			newCategories: 0,
			errors: 0,
		};
	}

	async analyzeContext(text, apiProvider = "openai") {
		if (!text || !this.config.enabled) {
			return null;
		}

		if (text.length < this.config.minTextLength) {
			return this._fastKeywordMatch(text);
		}

		const cacheKey = this._getCacheKey(text);

		if (this.cache.has(cacheKey)) {
			this.stats.cacheHits++;
			return this.cache.get(cacheKey);
		}

		const keywordMatch = this._fastKeywordMatch(text);

		if (keywordMatch && keywordMatch.confidence > 0.85) {
			this.stats.keywordMatches++;
			this.cache.set(cacheKey, keywordMatch);
			return keywordMatch;
		}

		if (!this.config.useAI) {
			return keywordMatch || this._getDefaultContext();
		}

		try {
			this.stats.totalAnalyzed++;
			this.stats.aiCalls++;

			const provider = ProviderFactory.getProvider(apiProvider, true);

			if (!provider) {
				throw new Error("AI provider not available for context analysis");
			}

			const analysisPrompt =
				text.length < 500
					? this._createSimplifiedAnalysisPrompt(text)
					: this._createAnalysisPrompt(text);

			const result = await rateLimiter.enqueue(apiProvider.toLowerCase(), () =>
				provider.analyze(analysisPrompt, this.config.analysisOptions)
			);

			const contextData = this._parseAnalysisResult(result);

			if (contextData) {
				this.cache.set(cacheKey, contextData);
			} else if (keywordMatch) {
				this.cache.set(cacheKey, keywordMatch);
				return keywordMatch;
			}

			return contextData;
		} catch (error) {
			this.stats.errors++;
			console.error("AI context analysis error:", error.message);

			if (keywordMatch) {
				return keywordMatch;
			}

			return this._getDefaultContext();
		}
	}

	_createAnalysisPrompt(text) {
		const categories = Object.keys(this.config.categories).join(", ");

		const maxTextLength = this.config.analysisOptions?.maxTokens
			? Math.min(1500, this.config.analysisOptions.maxTokens * 5)
			: 1500;

		const truncatedText =
			text.length > maxTextLength ? text.substring(0, maxTextLength) + "..." : text;

		return `
TASK: Analyze the following text and determine its context category.

TEXT TO ANALYZE:
"""
${truncatedText}
"""

AVAILABLE CATEGORIES: ${categories}${this.config.allowNewCategories ? ", or suggest a new category if none of these fit" : ""}

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

	_createSimplifiedAnalysisPrompt(text) {
		const categories = Object.keys(this.config.categories).join(", ");

		return `
TASK: Categorize the following text. Be concise.

TEXT: "${text}"

CATEGORIES: ${categories}${this.config.allowNewCategories ? " (or suggest new)" : ""}

RESPONSE FORMAT:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2", "keyword3"]
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
				this.stats.newCategories++;
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

	_fastKeywordMatch(text) {
		if (!text || !this.config?.categories) {
			return this._getDefaultContext();
		}

		const textLower = text.toLowerCase();
		const scores = {};
		let maxScore = 0;
		let bestCategory = this.config.fallback?.category || "general";

		for (const [category, keywordSet] of Object.entries(this.categoryKeywords)) {
			let score = 0;

			for (const keyword of keywordSet) {
				const regex = new RegExp(`\\b${keyword}\\b`, "i");
				if (regex.test(textLower)) {
					score += 2;
				} else if (textLower.includes(keyword)) {
					score += 1;
				}
			}

			if (score > 0) {
				const weight = this.config.categories[category]?.weight || 1.0;
				score *= weight;

				scores[category] = score;

				if (score > maxScore) {
					maxScore = score;
					bestCategory = category;
				}
			}
		}

		const maxPossibleScore = Math.max(8, Object.keys(this.categoryKeywords).length * 2);
		const baseConfidence = Math.min(0.9, maxScore / maxPossibleScore);
		const confidence = Math.min(0.95, 1 - Math.exp(-baseConfidence * 2));

		if (confidence < this.config.detection.minConfidence) {
			return this._getDefaultContext();
		}

		return {
			category: bestCategory,
			confidence,
			keywords: Array.from(this.categoryKeywords[bestCategory] || []).slice(0, 5),
			explanation: `Matched keywords for ${bestCategory} category`,
			prompt: this.config.categories[bestCategory]?.prompt || this.config.fallback.prompt,
			method: "keyword_match",
		};
	}

	_getDefaultContext() {
		return {
			category: this.config.fallback?.category || "general",
			confidence: 0.5,
			keywords: [],
			explanation: "Default category used",
			prompt: this.config.fallback?.prompt || "Translate naturally",
			method: "default",
		};
	}

	_findClosestCategory(suggestedCategory, keywords) {
		let bestMatch = this.config.fallback?.category || "general";
		let highestScore = 0;

		for (const [category, config] of Object.entries(this.config.categories)) {
			let score = 0;

			if (config.keywords && this.categoryKeywords[category]) {
				const keywordsLower = new Set(keywords.map((k) => k.toLowerCase()));

				for (const keyword of keywordsLower) {
					if (this.categoryKeywords[category].has(keyword)) {
						score += 1.5;
						continue;
					}

					for (const configKeyword of this.categoryKeywords[category]) {
						if (configKeyword.includes(keyword) || keyword.includes(configKeyword)) {
							score += 0.75;
							break;
						}
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

			this.categoryKeywords[category] = new Set(keywords.map((k) => k.toLowerCase()));

			console.log(`Added new context category: ${category}`);
		}
	}

	_getCacheKey(text) {
		if (text.length < 50) {
			return text.toLowerCase();
		}

		const start = text.substring(0, 50).toLowerCase();
		const middle =
			text.length > 100
				? text
						.substring(
							Math.floor(text.length / 2) - 25,
							Math.floor(text.length / 2) + 25
						)
						.toLowerCase()
				: "";
		const end = text.length > 50 ? text.substring(text.length - 50).toLowerCase() : "";

		return crypto
			.createHash("md5")
			.update(start + middle + end)
			.digest("hex");
	}

	getStats() {
		return {
			...this.stats,
			cacheSize: this.cache.size,
			cacheCapacity: this.cache.max,
			hitRate: this.stats.cacheHits / Math.max(1, this.stats.totalAnalyzed),
			aiUsageRate: this.stats.aiCalls / Math.max(1, this.stats.totalAnalyzed),
			keywordMatchRate: this.stats.keywordMatches / Math.max(1, this.stats.totalAnalyzed),
			errorRate: this.stats.errors / Math.max(1, this.stats.totalAnalyzed),
		};
	}

	resetStats() {
		this.stats = {
			totalAnalyzed: 0,
			aiCalls: 0,
			cacheHits: 0,
			keywordMatches: 0,
			newCategories: 0,
			errors: 0,
		};
	}

	clearCache() {
		this.cache.clear();
	}
}

module.exports = AIContextAnalyzer;
