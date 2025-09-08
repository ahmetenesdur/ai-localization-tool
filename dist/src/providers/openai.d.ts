import { BaseProvider } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "../types";
/**
 * REFACTORED: OpenAI provider now extends BaseProvider for consistency
 */
export declare class OpenAIProvider extends BaseProvider {
    private client;
    constructor(config: ApiConfig);
    getApiKey(): string | undefined;
    getEndpoint(): string;
    translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
    private sanitizeTranslation;
}
declare const openaiProvider: OpenAIProvider;
export declare function translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
export declare function analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
export { openaiProvider };
//# sourceMappingURL=openai.d.ts.map