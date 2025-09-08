import type { ContextConfig, ContextData } from "../types";
/**
 * AI Context Analyzer for categorizing text content
 */
export declare class AIContextAnalyzer {
    private config;
    private cache;
    private categoryKeywords;
    private stats;
    constructor(config: ContextConfig);
    analyzeContext(text: string, apiProvider?: string): Promise<ContextData | null>;
    private _createAnalysisPrompt;
    private _createSimplifiedAnalysisPrompt;
    private _parseAnalysisResult;
    private _fastKeywordMatch;
    private _getDefaultContext;
    private _findClosestCategory;
    private _saveNewCategory;
    /**
     * Generate a collision-resistant cache key for text
     */
    private _getCacheKey;
    getStats(): Record<string, number>;
    resetStats(): void;
    clearCache(): void;
}
export default AIContextAnalyzer;
//# sourceMappingURL=ai-context-analyzer.d.ts.map