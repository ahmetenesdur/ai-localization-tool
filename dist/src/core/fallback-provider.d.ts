interface ProviderImplementation {
    translate: (text: string, sourceLang: string, targetLang: string, options?: any) => Promise<string>;
    analyze?: (prompt: string, options?: any) => Promise<string>;
}
interface ProviderEntry {
    name: string;
    implementation: ProviderImplementation;
}
interface ProviderStats {
    success: number;
    failure: number;
    avgResponseTime: number;
    totalTime: number;
    lastSuccess: Date | null;
    consecutiveFailures: number;
    lastError: {
        time: Date;
        message: string;
    } | null;
    disabled: boolean;
    disabledUntil: number | null;
    successRate?: number;
    totalCalls?: number;
    avgResponseTimeMs?: number;
    isDisabled?: boolean;
    enablesInMs?: number;
}
interface TranslationOptions {
    [key: string]: any;
}
declare class FallbackProvider {
    private providers;
    private currentIndex;
    private providerStats;
    private maxRetries;
    private reRankInterval;
    private operationCount;
    private lastErrorTime;
    private consecutiveErrors;
    constructor(providers: ProviderEntry[]);
    private _calculatePriority;
    translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    analyze(prompt: string, options?: TranslationOptions): Promise<string>;
    getStats(): Record<string, ProviderStats>;
    reset(): void;
    resetStats(): void;
    private _checkAndReRankProviders;
    private _disableProvider;
    private _isProviderDisabled;
    private _resetDisabledProviders;
    private _getProviderName;
}
export default FallbackProvider;
export { FallbackProvider };
export type { ProviderEntry, ProviderImplementation, ProviderStats, TranslationOptions };
//# sourceMappingURL=fallback-provider.d.ts.map