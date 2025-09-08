import type { LocalizationConfig, TranslationOptions } from "../types";
interface WrappedProvider {
    translate: (text: string, sourceLang: string, targetLang: string, options?: TranslationOptions) => Promise<string>;
    analyze?: (prompt: string, options?: any) => Promise<string>;
}
export declare class ProviderFactory {
    /**
     * Get provider with intelligent fallback based on configuration
     * FIXED: Now respects config.fallbackOrder for proper provider chaining
     */
    static getProvider(providerName?: string, useFallback?: boolean, config?: LocalizationConfig | null): WrappedProvider | any;
    static getAvailableProviders(): string[];
    static validateProviders(): string[];
    static isProviderConfigured(providerName: string): boolean;
}
export default ProviderFactory;
//# sourceMappingURL=provider-factory.d.ts.map