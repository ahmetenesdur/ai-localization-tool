import type { TranslationOptions, ApiConfig } from "../types";
export interface ProviderResponse {
    data?: any;
    choices?: Array<{
        message?: {
            content?: string;
        };
        text?: string;
        delta?: {
            content?: string;
        };
    }>;
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    output?: {
        text?: string;
    };
    text?: string;
    content?: string;
}
export interface ProviderError extends Error {
    response?: {
        status: number;
        data?: {
            error?: {
                message?: string;
            };
            message?: string;
        };
    };
    code?: string;
}
/**
 * OPTIMIZED: Abstract base class for all translation providers
 * Eliminates code duplication and provides consistent interface
 */
export declare abstract class BaseProvider {
    protected name: string;
    protected config: ApiConfig;
    protected defaultModel: string;
    protected defaultTemperature: number;
    protected defaultMaxTokens: number;
    protected commonHeaders: Record<string, string>;
    constructor(name: string, config: ApiConfig);
    /**
     * Abstract method - must be implemented by subclasses
     */
    abstract translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    /**
     * Abstract method - must be implemented by subclasses
     */
    abstract getApiKey(): string | undefined;
    /**
     * Abstract method - must be implemented by subclasses
     */
    abstract getEndpoint(): string;
    /**
     * OPTIMIZED: Common request validation logic
     */
    protected validateRequest(text: string, sourceLang: string, targetLang: string): void;
    /**
     * OPTIMIZED: Common response validation logic
     */
    protected validateResponse(response: ProviderResponse, providerName: string): boolean;
    /**
     * OPTIMIZED: Common error handling
     */
    protected handleApiError(error: ProviderError, providerName: string): never;
    /**
     * OPTIMIZED: Generate translation prompt with context
     */
    protected generatePrompt(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): string;
    /**
     * OPTIMIZED: Common configuration getter with validation
     */
    protected getConfig(options?: TranslationOptions): {
        model: string;
        temperature: number;
        max_tokens: number;
        apiKey: string;
        endpoint: string;
    };
    /**
     * OPTIMIZED: Extract translation from various response formats
     */
    protected extractTranslation(response: ProviderResponse, providerName: string): string;
    /**
     * Validate translation quality and consistency
     */
    protected validateTranslation(original: string, translated: string): boolean;
    /**
     * Get provider name
     */
    getName(): string;
    /**
     * Get provider configuration
     */
    getProviderConfig(): ApiConfig;
}
//# sourceMappingURL=base-provider.d.ts.map