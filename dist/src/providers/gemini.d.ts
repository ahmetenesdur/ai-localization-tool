import { BaseProvider } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "../types";
/**
 * Gemini provider implementation
 */
export declare class GeminiProvider extends BaseProvider {
    private client;
    constructor(config: ApiConfig);
    getApiKey(): string | undefined;
    getEndpoint(): string;
    translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
    private sanitizeTranslation;
}
declare const geminiProvider: GeminiProvider;
export declare function translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
export declare function analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
export { geminiProvider };
//# sourceMappingURL=gemini.d.ts.map