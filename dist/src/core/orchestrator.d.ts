import rateLimiter from "../utils/rate-limiter";
import type { LocalizationConfig, TranslationResult, ContextData, CacheStats, AdvancedConfig } from "../types";
interface TranslationItem {
    key: string;
    text: string;
    targetLang: string;
    existingTranslation?: string;
}
export declare class Orchestrator {
    private options;
    private contextProcessor;
    private progress;
    private qualityChecker;
    private advanced;
    private translationCache;
    private cacheStats;
    private concurrencyLimit;
    private _shutdownCallback;
    constructor(options: LocalizationConfig);
    processTranslation(key: string, text: string, targetLang: string, contextData?: ContextData, existingTranslation?: string): Promise<TranslationResult>;
    processTranslations(items: TranslationItem[]): Promise<TranslationResult[]>;
    private _chunkArray;
    private _applyAutoOptimizations;
    clearCache(): void;
    resetCacheStats(): void;
    getCacheStats(): CacheStats & {
        size: number;
        capacity: number;
        hitRate: number;
    };
    /**
     * OPTIMIZED: Generate cache key with improved performance
     * Using faster hashing for better performance while maintaining collision resistance
     */
    private _generateCacheKey;
    private _refreshCacheEntry;
    getStatus(): {
        cache: ReturnType<Orchestrator["getCacheStats"]>;
        rateLimiter: ReturnType<typeof rateLimiter.getStatus>;
        concurrency: number;
        advanced: Required<AdvancedConfig>;
    };
    /**
     * FIXED: Proper cleanup method to prevent memory leaks
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=orchestrator.d.ts.map