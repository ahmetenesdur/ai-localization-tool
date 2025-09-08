import { BaseProvider } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "../types";
/**
 * DashScope provider implementation
 */
export declare class DashScopeProvider extends BaseProvider {
    private client;
    private generationClient;
    constructor(config: ApiConfig);
    getApiKey(): string | undefined;
    getEndpoint(): string;
    private getGenerationEndpoint;
    translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
    analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
    private sanitizeTranslation;
}
declare const dashscopeProvider: DashScopeProvider;
export declare function translate(text: string, sourceLang: string, targetLang: string, options?: TranslationOptions): Promise<string>;
export declare function analyze(prompt: string, options?: Partial<ApiConfig>): Promise<string>;
export { dashscopeProvider };
//# sourceMappingURL=dashscope.d.ts.map