/**
 * ENHANCED: Get length instructions with comprehensive input validation
 * @param options - Configuration options
 * @returns Length instructions for translation
 */
import type { TranslationOptions } from "../types";
export interface PromptTemplates {
    /**
     * ENHANCED: Get translation prompt with comprehensive input validation
     * @param provider - Translation provider name
     * @param sourceLang - Source language code
     * @param targetLang - Target language code
     * @param text - Text to translate
     * @param options - Translation options
     * @returns Generated prompt for the specified provider
     */
    getPrompt: (provider: string, sourceLang: string, targetLang: string, text: string, options: TranslationOptions) => any;
    /**
     * ENHANCED: Get analysis prompt with comprehensive input validation
     * @param provider - Analysis provider name
     * @param text - Text to analyze
     * @param options - Analysis options
     * @returns Generated analysis prompt for the specified provider
     */
    getAnalysisPrompt: (provider: string, text: string, options?: any) => any;
}
export declare const promptTemplates: PromptTemplates;
export default promptTemplates;
//# sourceMappingURL=prompt-templates.d.ts.map