"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextProcessor = void 0;
const crypto = __importStar(require("crypto"));
const lru_cache_1 = require("lru-cache");
class ContextProcessor {
    constructor(config) {
        this.keywordCache = new Map();
        this.config = config;
        this.resultCache = new lru_cache_1.LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 60 * 24,
        });
        // TODO: Import and initialize AIContextAnalyzer when migrated
        // this.aiAnalyzer = new AIContextAnalyzer(config);
        this.initializeKeywords();
    }
    initializeKeywords() {
        for (const [category, config] of Object.entries(this.config.categories)) {
            const pattern = config.keywords
                .map((keyword) => keyword.toLowerCase())
                .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                .join("|");
            this.keywordCache.set(category, {
                regex: new RegExp(`\\b(${pattern})\\b`, "gi"),
                weight: config.weight || 1.0,
                prompt: config.prompt,
            });
        }
    }
    async analyze(text) {
        if (!text || !this.config.enabled) {
            return this.getFallback();
        }
        const cacheKey = this.getCacheKey(text, {});
        const cachedResult = this.resultCache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }
        // AI analysis for longer texts
        if (this.config.useAI && text.length >= this.config.minTextLength && this.aiAnalyzer) {
            try {
                const aiResult = await this.aiAnalyzer.analyzeContext(text, this.config.aiProvider || "openai");
                if (aiResult) {
                    console.log(`🧠 AI Context Analysis: ${aiResult.category} (${(aiResult.confidence * 100).toFixed(1)}%)`);
                    if (this.config.debug) {
                        console.log(`📊 AI Analysis Details:
- Category: ${aiResult.category}
- Confidence: ${(aiResult.confidence * 100).toFixed(1)}%
- Keywords: ${aiResult.keywords.join(", ")}
- Explanation: ${aiResult.explanation || "N/A"}`);
                    }
                    const result = {
                        category: aiResult.category,
                        confidence: aiResult.confidence,
                        keywords: aiResult.keywords,
                    };
                    this.resultCache.set(cacheKey, result);
                    return result;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("AI context analysis failed:", errorMessage);
            }
        }
        // Keyword-based analysis
        const result = this.performKeywordAnalysis(text);
        this.resultCache.set(cacheKey, result);
        return result;
    }
    performKeywordAnalysis(text) {
        const lowerText = text.toLowerCase();
        const results = new Map();
        let totalScore = 0;
        const isShortText = text.length < 500;
        for (const [category, config] of this.keywordCache.entries()) {
            let matches;
            if (isShortText) {
                matches = lowerText.match(config.regex) || [];
            }
            else {
                matches = [];
                const keywords = this.config.categories[category]?.keywords || [];
                for (const keyword of keywords) {
                    const keywordLower = keyword.toLowerCase();
                    let pos = lowerText.indexOf(keywordLower);
                    while (pos !== -1) {
                        const prevChar = lowerText[pos - 1];
                        const nextChar = lowerText[pos + keywordLower.length];
                        const isPrevBoundary = !prevChar || !/[a-z0-9_]/i.test(prevChar);
                        const isNextBoundary = !nextChar || !/[a-z0-9_]/i.test(nextChar);
                        if (isPrevBoundary && isNextBoundary) {
                            matches.push(keyword);
                        }
                        pos = lowerText.indexOf(keywordLower, pos + 1);
                    }
                }
            }
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
        if (totalScore === 0)
            return this.getFallback();
        const bestMatches = Array.from(results.entries())
            .map(([category, data]) => ({
            category,
            confidence: data.score / totalScore,
            matches: data.matches,
        }))
            .filter((match) => match.confidence >= this.config.detection.minConfidence)
            .sort((a, b) => b.confidence - a.confidence);
        const bestMatch = bestMatches[0];
        if (!bestMatch)
            return this.getFallback();
        return {
            category: bestMatch.category,
            confidence: bestMatch.confidence,
            keywords: [], // Could be populated with actual matched keywords if needed
        };
    }
    getFallback() {
        return {
            category: this.config.fallback.category,
            confidence: 1.0,
            keywords: [],
        };
    }
    /**
     * Generate a collision-resistant cache key for text and context
     */
    getCacheKey(text, context) {
        let keyContent;
        if (text.length <= 200) {
            // Short text: use as-is
            keyContent = text;
        }
        else if (text.length <= 1000) {
            // Medium text: sample from beginning, middle, and end
            const third = Math.floor(text.length / 3);
            const start = text.substring(0, 50);
            const middle = text.substring(third, third + 50);
            const end = text.substring(text.length - 50);
            keyContent = `${start}|MID:${middle}|${end}`;
        }
        else {
            // Long text: smart sampling with length and position info
            const quarter = Math.floor(text.length / 4);
            const start = text.substring(0, 40);
            const q1 = text.substring(quarter, quarter + 30);
            const q2 = text.substring(quarter * 2, quarter * 2 + 30);
            const q3 = text.substring(quarter * 3, quarter * 3 + 30);
            const end = text.substring(text.length - 40);
            // Include text length and character diversity info for uniqueness
            const charSet = new Set(text.toLowerCase()).size;
            keyContent = `LEN:${text.length}|CHARS:${charSet}|${start}|Q1:${q1}|Q2:${q2}|Q3:${q3}|${end}`;
        }
        const contextString = JSON.stringify(context);
        const hashInput = `${keyContent}|CTX:${contextString}`;
        return crypto.createHash("sha256").update(hashInput, "utf8").digest("hex").substring(0, 32); // Truncate for storage efficiency while maintaining uniqueness
    }
}
exports.ContextProcessor = ContextProcessor;
//# sourceMappingURL=context-processor.js.map