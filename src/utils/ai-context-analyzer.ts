import axios from "axios";
import ProviderFactory from "@/core/provider-factory";
import rateLimiter from "@/utils/rate-limiter";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import type { ContextConfig, ContextData, ContextCategory } from "@/types";

interface AnalysisResult {
	category: string;
	confidence: number;
	keywords: string[];
	explanation?: string;
}

interface ContextStats {
	totalAnalyzed: number;
	aiCalls: number;
	cacheHits: number;
	keywordMatches: number;
	newCategories: number;
	errors: number;
}

interface CacheEntry extends ContextData {
	method?: string;
}

/**
 * AI Context Analyzer for categorizing text content
 */
export class AIContextAnalyzer {
	private config: ContextConfig;
	private cache: LRUCache<string, CacheEntry>;
	private categoryKeywords: Record<string, Set<string>>;
	private stats: ContextStats;

	constructor(config: ContextConfig) {
		this.config = config;
		this.cache = new LRUCache<string, CacheEntry>({
			max: 500,
			ttl: 1000 * 60 * 60 * 24,
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

	async analyzeContext(
		text: string,
		apiProvider: string = "openai"
	): Promise<ContextData | null> {
		if (!text || !this.config.enabled) {
			return null;
		}

		if (text.length < this.config.minTextLength) {
			return this._fastKeywordMatch(text);
		}

		const cacheKey = this._getCacheKey(text);

		if (this.cache.has(cacheKey)) {
			this.stats.cacheHits++;
			const cached = this.cache.get(cacheKey);
			// Remove the explanation property if it exists (it's not part of ContextData)
			if (cached) {
				const { explanation, ...contextData } = cached as any;
				return contextData as ContextData;
			}
			return null;
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

			// Fix: Pass the correct parameters to ProviderFactory.getProvider
			const provider = ProviderFactory.getProvider(apiProvider, true, null);

			if (!provider) {
				throw new Error("AI provider not available for context analysis");
			}

			const analysisPrompt =
				text.length < 500
					? this._createSimplifiedAnalysisPrompt(text)
					: this._createAnalysisPrompt(text);

			const result = await rateLimiter.enqueue(apiProvider.toLowerCase(), () =>
				provider.analyze!(analysisPrompt, this.config.analysisOptions)
			);

			// Fix: Cast result to string since it's unknown
			const contextData = this._parseAnalysisResult(result as string);

			if (contextData) {
				this.cache.set(cacheKey, contextData);
			} else if (keywordMatch) {
				this.cache.set(cacheKey, keywordMatch);
				return keywordMatch;
			}

			return contextData;
		} catch (error: any) {
			this.stats.errors++;
			console.error("AI context analysis error:", error.message);

			if (keywordMatch) {
				return keywordMatch;
			}

			return this._getDefaultContext();
		}
	}

	private _createAnalysisPrompt(text: string): string {
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

	private _createSimplifiedAnalysisPrompt(text: string): string {
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

	private _parseAnalysisResult(result: string): ContextData | null {
		try {
			const jsonMatch = result.match(/\{[\s\S]*?\}/);
			if (!jsonMatch) {
				throw new Error("No valid JSON found in AI response");
			}

			let analysisData: AnalysisResult;
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

			// Fix: Return only properties that exist in ContextData interface
			return {
				category,
				confidence: analysisData.confidence,
				keywords: analysisData.keywords || [],
			};
		} catch (error: any) {
			console.error("Error parsing AI analysis result:", error.message);
			return null;
		}
	}

	private _fastKeywordMatch(text: string): ContextData | null {
		if (!text || !this.config?.categories) {
			return this._getDefaultContext();
		}

		const textLower = text.toLowerCase();
		const scores: Record<string, number> = {};
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

		// Fix: Return only properties that exist in ContextData interface
		return {
			category: bestCategory,
			confidence,
			keywords: Array.from(this.categoryKeywords[bestCategory] || []).slice(0, 5),
		};
	}

	private _getDefaultContext(): ContextData {
		// Fix: Return only properties that exist in ContextData interface
		return {
			category: this.config.fallback?.category || "general",
			confidence: 0.5,
			keywords: [],
		};
	}

	private _findClosestCategory(suggestedCategory: string, keywords: string[]): string {
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

	private _saveNewCategory(category: string, keywords: string[]): void {
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

	/**
	 * Generate a collision-resistant cache key for text
	 */
	private _getCacheKey(text: string): string {
		let keyContent: string;

		if (text.length <= 100) {
			// Short text: use as-is (lowercased for consistency)
			keyContent = text.toLowerCase();
		} else if (text.length <= 500) {
			// Medium text: sample from beginning, middle, and end with better distribution
			const start = text.substring(0, 40).toLowerCase();
			const middlePos = Math.floor(text.length / 2);
			const middle = text.substring(middlePos - 20, middlePos + 20).toLowerCase();
			const end = text.substring(text.length - 40).toLowerCase();
			keyContent = `${start}|MID:${middle}|${end}`;
		} else {
			// Long text: enhanced sampling with length and character diversity
			const quarter = Math.floor(text.length / 4);
			const start = text.substring(0, 30).toLowerCase();
			const q1 = text.substring(quarter, quarter + 25).toLowerCase();
			const q2 = text.substring(quarter * 2, quarter * 2 + 25).toLowerCase();
			const q3 = text.substring(quarter * 3, quarter * 3 + 25).toLowerCase();
			const end = text.substring(text.length - 30).toLowerCase();

			// Include length and character diversity for additional uniqueness
			const charSet = new Set(text.toLowerCase()).size;
			const wordCount = text.split(/\s+/).length;
			keyContent = `LEN:${text.length}|WORDS:${wordCount}|CHARS:${charSet}|${start}|Q1:${q1}|Q2:${q2}|Q3:${q3}|${end}`;
		}

		return crypto
			.createHash("sha256")
			.update(keyContent, "utf8")
			.digest("hex")
			.substring(0, 32); // Truncate for storage efficiency while maintaining uniqueness
	}

	getStats(): Record<string, number> {
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

	resetStats(): void {
		this.stats = {
			totalAnalyzed: 0,
			aiCalls: 0,
			cacheHits: 0,
			keywordMatches: 0,
			newCategories: 0,
			errors: 0,
		};
	}

	clearCache(): void {
		this.cache.clear();
	}
}

export default AIContextAnalyzer;
