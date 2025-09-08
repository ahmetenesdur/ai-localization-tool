import { BaseProvider } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "../types";
/**
 * XAI provider implementation
 */
export declare class XAIProvider extends BaseProvider {
    private client;
    constructor(config: ApiConfig);
    getApiKey(): string | undefined;
    getEndpoint(): string;
    translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
    private sanitizeTranslation;
}
declare const xaiProvider: XAIProvider;
export declare function translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
export declare function analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
export { xaiProvider };
//# sourceMappingURL=xai.d.ts.map