const axios = require("axios");
const ProviderFactory = require("../core/provider-factory");
const rateLimiter = require("./rate-limiter");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");
const CONSTANTS = require("./constants");
const { ContextAnalysisError, ErrorFactory } = require("./errors");

class AIContextAnalyzer {
	constructor(config) {
		this.config = config;
		this.cache = new LRUCache({
			max: config.cacheSize || CONSTANTS.CACHE.CONTEXT_CACHE_SIZE,
			ttl: config.cacheTTL || CONSTANTS.CACHE.DEFAULT_TTL,
			updateAgeOnGet: true,
			allowStale: true,
		});

		// MEMORY FIX: Add cleanup intervals and size limits
		this.categoryKeywords = new Map(); // Use Map for better performance
		this.maxCategoryKeywords = CONSTANTS.CONTEXT.MAX_CATEGORY_KEYWORDS; // Limit keywords per category
		this.lastCleanup = Date.now();
		this.cleanupInterval = CONSTANTS.CONTEXT.CLEANUP_INTERVAL;

		// Initialize keywords with memory management
		this._initializeKeywords();

		this.stats = {
			totalAnalyzed: 0,
			aiCalls: 0,
			cacheHits: 0,
			keywordMatches: 0,
			newCategories: 0,
			errors: 0,
			cleanupRuns: 0,
			memoryOptimizations: 0,
		};

		// PERFORMANCE FIX: Schedule periodic cleanup
		this._scheduleCleanup();
	}

	/**
	 * MEMORY FIX: Initialize keywords with size limits and cleanup
	 */
	_initializeKeywords() {
		if (!this.config.categories) return;

		this.categoryKeywords.clear(); // Ensure clean start

		Object.entries(this.config.categories).forEach(([category, data]) => {
			if (data.keywords && Array.isArray(data.keywords)) {
				// PERFORMANCE FIX: Limit keywords per category to prevent memory growth
				const limitedKeywords = data.keywords
					.slice(0, this.maxCategoryKeywords)
					.map((k) => k.toLowerCase())
					.filter((k) => k.length > 0 && k.length <= CONSTANTS.VALIDATION.MAX_KEY_LENGTH);

				this.categoryKeywords.set(category, new Set(limitedKeywords));
			}
		});
	}

	/**
	 * MEMORY FIX: Schedule periodic cleanup to prevent memory growth
	 */
	_scheduleCleanup() {
		setInterval(() => {
			this._performMemoryCleanup();
		}, this.cleanupInterval);
	}

	/**
	 * MEMORY FIX: Perform memory cleanup operations
	 */
	_performMemoryCleanup() {
		const now = Date.now();

		try {
			// Only run cleanup if enough time has passed
			if (now - this.lastCleanup < this.cleanupInterval) {
				return;
			}

			let optimizations = 0;

			// Clean up categoryKeywords if they're getting too large
			for (const [category, keywordSet] of this.categoryKeywords.entries()) {
				if (keywordSet.size > this.maxCategoryKeywords) {
					// Keep only the first N keywords (most important ones)
					const limitedKeywords = Array.from(keywordSet).slice(
						0,
						this.maxCategoryKeywords
					);
					this.categoryKeywords.set(category, new Set(limitedKeywords));
					optimizations++;
				}
			}

			// Remove categories that are no longer in config
			if (this.config.categories) {
				const configCategories = new Set(Object.keys(this.config.categories));
				for (const category of this.categoryKeywords.keys()) {
					if (!configCategories.has(category)) {
						this.categoryKeywords.delete(category);
						optimizations++;
					}
				}
			}

			// Clear cache if it's getting too large relative to its max size
			if (this.cache.size > this.cache.max * CONSTANTS.CACHE.UTILIZATION_THRESHOLD) {
				// Clear oldest 25% of entries
				const entriesToRemove = Math.floor(
					this.cache.size * CONSTANTS.CACHE.CLEANUP_PERCENTAGE
				);
				const keys = [...this.cache.keys()];
				for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
					this.cache.delete(keys[i]);
				}
				optimizations++;
			}

			this.stats.cleanupRuns++;
			this.stats.memoryOptimizations += optimizations;
			this.lastCleanup = now;

			// Log cleanup results if debug mode
			if (this.config.debug && optimizations > 0) {
				console.log(
					`🧹 Memory cleanup completed: ${optimizations} optimizations performed`
				);
			}
		} catch (error) {
			console.warn("Memory cleanup failed:", error.message);
		}
	}

	async analyzeContext(text, apiProvider = "openai") {
		if (!text || !this.config.enabled) {
			return null;
		}

		// PERFORMANCE FIX: Validate input early
		if (typeof text !== "string") {
			throw new ContextAnalysisError("Text must be a string", text, "input_validation");
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

		if (keywordMatch && keywordMatch.confidence > CONSTANTS.CONTEXT.HIGH_CONFIDENCE_THRESHOLD) {
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

			const provider = ProviderFactory.getProvider(apiProvider, true, this.config);

			if (!provider) {
				throw new ContextAnalysisError(
					"AI provider not available for context analysis",
					text,
					"provider_unavailable"
				);
			}

			const analysisPrompt =
				text.length < CONSTANTS.CONTEXT.FAST_ANALYSIS_THRESHOLD
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

			// Use custom error types
			const contextError =
				error instanceof ContextAnalysisError
					? error
					: new ContextAnalysisError(
							`AI context analysis failed: ${error.message}`,
							text,
							"ai_analysis"
						);

			console.error("AI context analysis error:", contextError.message);

			if (keywordMatch) {
				return keywordMatch;
			}

			return this._getDefaultContext();
		}
	}

	_createAnalysisPrompt(text) {
		const categories = Object.keys(this.config.categories).join(", ");

		const maxTextLength = this.config.analysisOptions?.maxTokens
			? Math.min(
					CONSTANTS.CONTEXT.MAX_TEXT_FOR_ANALYSIS,
					this.config.analysisOptions.maxTokens * 5
				)
			: CONSTANTS.CONTEXT.MAX_TEXT_FOR_ANALYSIS;

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
				throw new ContextAnalysisError(
					"No valid JSON found in AI response",
					null,
					"json_parsing"
				);
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
				throw new ContextAnalysisError(
					"Invalid analysis data structure",
					null,
					"data_validation"
				);
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
				confidence: Math.min(analysisData.confidence, CONSTANTS.CONTEXT.MAX_CONFIDENCE),
				keywords: (analysisData.keywords || []).slice(
					0,
					CONSTANTS.CONTEXT.MAX_KEYWORDS_DISPLAY
				), // Limit keywords
				explanation: analysisData.explanation || "No explanation provided",
				prompt: this.config.categories[category]?.prompt || this.config.fallback.prompt,
			};
		} catch (error) {
			throw new ContextAnalysisError(
				`Error parsing AI analysis result: ${error.message}`,
				null,
				"result_parsing"
			);
		}
	}

	/**
	 * PERFORMANCE FIX: Optimized keyword matching with early exit conditions
	 */
	_fastKeywordMatch(text) {
		if (!text || !this.config?.categories) {
			return this._getDefaultContext();
		}

		const textLower = text.toLowerCase();
		const scores = new Map(); // Use Map for better performance
		let maxScore = 0;
		let bestCategory = this.config.fallback?.category || "general";

		// PERFORMANCE FIX: Early exit for very short text
		if (text.length < CONSTANTS.CONTEXT.MIN_TEXT_LENGTH) {
			return this._getDefaultContext();
		}

		// PERFORMANCE FIX: Use iterator for better memory efficiency
		for (const [category, keywordSet] of this.categoryKeywords.entries()) {
			let score = 0;

			// PERFORMANCE FIX: Early exit if category not in config anymore
			if (!this.config.categories[category]) {
				continue;
			}

			// PERFORMANCE FIX: Limit keyword checking for very long text
			const isLongText = text.length > CONSTANTS.CONTEXT.LONG_TEXT_THRESHOLD;
			let keywordCount = 0;
			const maxKeywordsToCheck = isLongText
				? CONSTANTS.CONTEXT.KEYWORD_LIMIT_CHECK
				: keywordSet.size;

			for (const keyword of keywordSet) {
				if (keywordCount >= maxKeywordsToCheck) break;
				keywordCount++;

				const regex = new RegExp(
					`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
					"i"
				);
				if (regex.test(textLower)) {
					score += CONSTANTS.CONTEXT.KEYWORD_EXACT_MATCH_SCORE;
				} else if (textLower.includes(keyword)) {
					score += CONSTANTS.CONTEXT.KEYWORD_PARTIAL_MATCH_SCORE;
				}

				// PERFORMANCE FIX: Early exit if score is already very high
				if (score > CONSTANTS.CONTEXT.HIGH_SCORE_THRESHOLD) break;
			}

			if (score > 0) {
				const weight = this.config.categories[category]?.weight || 1.0;
				score *= weight;

				scores.set(category, score);

				if (score > maxScore) {
					maxScore = score;
					bestCategory = category;
				}
			}
		}

		// PERFORMANCE FIX: Optimize confidence calculation
		const maxPossibleScore = Math.max(
			8,
			this.categoryKeywords.size * CONSTANTS.CONTEXT.KEYWORD_EXACT_MATCH_SCORE
		);
		const baseConfidence = Math.min(
			CONSTANTS.CACHE.UTILIZATION_THRESHOLD,
			maxScore / maxPossibleScore
		);
		const confidence = Math.min(
			CONSTANTS.CONTEXT.MAX_CONFIDENCE,
			1 - Math.exp(-baseConfidence * 2)
		);

		if (confidence < this.config.detection.minConfidence) {
			return this._getDefaultContext();
		}

		// PERFORMANCE FIX: Limit keywords in response
		const responseKeywords = this.categoryKeywords.get(bestCategory)
			? Array.from(this.categoryKeywords.get(bestCategory)).slice(0, 5)
			: [];

		return {
			category: bestCategory,
			confidence,
			keywords: responseKeywords,
			explanation: `Matched keywords for ${bestCategory} category`,
			prompt: this.config.categories[bestCategory]?.prompt || this.config.fallback.prompt,
			method: "keyword_match",
		};
	}

	_getDefaultContext() {
		return {
			category: this.config.fallback?.category || "general",
			confidence: CONSTANTS.CONTEXT.DEFAULT_CONFIDENCE,
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

			if (config.keywords && this.categoryKeywords.has(category)) {
				const keywordsLower = new Set(keywords.map((k) => k.toLowerCase()));
				const categoryKeywords = this.categoryKeywords.get(category);

				for (const keyword of keywordsLower) {
					if (categoryKeywords.has(keyword)) {
						score += CONSTANTS.CONTEXT.KEYWORD_ENHANCEMENT_SCORE;
						continue;
					}

					for (const configKeyword of categoryKeywords) {
						if (configKeyword.includes(keyword) || keyword.includes(configKeyword)) {
							score += CONSTANTS.CONTEXT.KEYWORD_SIMILARITY_SCORE;
							break;
						}
					}
				}
			}

			if (category.includes(suggestedCategory) || suggestedCategory.includes(category)) {
				score += CONSTANTS.CONTEXT.CLOSE_CATEGORY_MATCH_SCORE;
			}

			if (score > highestScore) {
				highestScore = score;
				bestMatch = category;
			}
		}

		return bestMatch;
	}

	/**
	 * MEMORY FIX: Improved new category saving with limits
	 */
	_saveNewCategory(category, keywords) {
		if (!this.config.categories[category]) {
			// MEMORY FIX: Limit keywords for new categories
			const limitedKeywords = keywords.slice(0, CONSTANTS.CONTEXT.MAX_NEW_CATEGORY_KEYWORDS); // Max 20 keywords for new categories

			this.config.categories[category] = {
				keywords: limitedKeywords,
				prompt: `Translate with awareness of ${category} context`,
				weight: 1.0,
			};

			// MEMORY FIX: Add to categoryKeywords with size limit
			const keywordSet = new Set(limitedKeywords.map((k) => k.toLowerCase()));
			this.categoryKeywords.set(category, keywordSet);

			console.log(
				`Added new context category: ${category} (${limitedKeywords.length} keywords)`
			);
		}
	}

	/**
	 * PERFORMANCE FIX: Enhanced cache key generation with constants
	 */
	_getCacheKey(text) {
		let keyContent;

		if (text.length <= CONSTANTS.CONTEXT.SHORT_TEXT_LIMIT) {
			keyContent = text.toLowerCase();
		} else if (text.length <= CONSTANTS.CONTEXT.MEDIUM_TEXT_LIMIT) {
			const start = text.substring(0, CONSTANTS.CONTEXT.CACHE_SAMPLE_START).toLowerCase();
			const middlePos = Math.floor(text.length / 2);
			const middle = text
				.substring(
					middlePos - CONSTANTS.CONTEXT.CACHE_SAMPLE_MID,
					middlePos + CONSTANTS.CONTEXT.CACHE_SAMPLE_MID
				)
				.toLowerCase();
			const end = text
				.substring(text.length - CONSTANTS.CONTEXT.CACHE_SAMPLE_END)
				.toLowerCase();
			keyContent = `${start}|MID:${middle}|${end}`;
		} else {
			const quarter = Math.floor(text.length / 4);
			const start = text.substring(0, CONSTANTS.CONTEXT.CACHE_SAMPLE_QUARTER).toLowerCase();
			const q1 = text
				.substring(quarter, quarter + CONSTANTS.CONTEXT.CACHE_SAMPLE_QUARTER_MID)
				.toLowerCase();
			const q2 = text
				.substring(quarter * 2, quarter * 2 + CONSTANTS.CONTEXT.CACHE_SAMPLE_QUARTER_MID)
				.toLowerCase();
			const q3 = text
				.substring(quarter * 3, quarter * 3 + CONSTANTS.CONTEXT.CACHE_SAMPLE_QUARTER_MID)
				.toLowerCase();
			const end = text
				.substring(text.length - CONSTANTS.CONTEXT.CACHE_SAMPLE_QUARTER)
				.toLowerCase();

			const charSet = new Set(text.toLowerCase()).size;
			const wordCount = text.split(/\s+/).length;
			keyContent = `LEN:${text.length}|WORDS:${wordCount}|CHARS:${charSet}|${start}|Q1:${q1}|Q2:${q2}|Q3:${q3}|${end}`;
		}

		return crypto
			.createHash("sha256")
			.update(keyContent, "utf8")
			.digest("hex")
			.substring(0, CONSTANTS.CACHE.HASH_TRUNCATE_LENGTH);
	}

	/**
	 * MEMORY FIX: Enhanced stats with memory information
	 */
	getStats() {
		return {
			...this.stats,
			cacheSize: this.cache.size,
			cacheCapacity: this.cache.max,
			categoryCount: this.categoryKeywords.size,
			totalKeywords: Array.from(this.categoryKeywords.values()).reduce(
				(sum, set) => sum + set.size,
				0
			),
			hitRate: this.stats.cacheHits / Math.max(1, this.stats.totalAnalyzed),
			aiUsageRate: this.stats.aiCalls / Math.max(1, this.stats.totalAnalyzed),
			keywordMatchRate: this.stats.keywordMatches / Math.max(1, this.stats.totalAnalyzed),
			errorRate: this.stats.errors / Math.max(1, this.stats.totalAnalyzed),
			memoryHealth: {
				lastCleanup: this.lastCleanup,
				cleanupRuns: this.stats.cleanupRuns,
				optimizations: this.stats.memoryOptimizations,
			},
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
			cleanupRuns: 0,
			memoryOptimizations: 0,
		};
	}

	/**
	 * MEMORY FIX: Enhanced cache clearing with memory cleanup
	 */
	clearCache() {
		this.cache.clear();
		this._performMemoryCleanup(); // Also cleanup other memory structures
	}

	/**
	 * MEMORY FIX: Manual cleanup trigger
	 */
	performCleanup() {
		this._performMemoryCleanup();
	}

	/**
	 * MEMORY FIX: Destroy instance and cleanup all resources
	 */
	destroy() {
		this.cache.clear();
		this.categoryKeywords.clear();
		this.resetStats();
	}
}

module.exports = AIContextAnalyzer;
