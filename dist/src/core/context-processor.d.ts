import type { ContextConfig, ContextData } from "../types";
export declare class ContextProcessor {
    private config;
    private keywordCache;
    private aiAnalyzer;
    private resultCache;
    constructor(config: ContextConfig);
    private initializeKeywords;
    analyze(text: string): Promise<ContextData>;
    private performKeywordAnalysis;
    private getBestMatch;
    private getFallback;
    /**
     * Generate a collision-resistant cache key for text and context
     */
    private getCacheKey;
}
//# sourceMappingURL=context-processor.d.ts.map