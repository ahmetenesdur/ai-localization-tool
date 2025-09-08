import type { LocalizationConfig } from "../types";
interface LanguageStats {
    processed: number;
    added: number;
    skipped: number;
    failed: number;
    timeMs: number;
    error?: string;
}
interface GlobalStats {
    total: number;
    byCategory: Record<string, number>;
    details: Record<string, {
        totalConfidence: number;
        samples: number;
    }>;
    totalTime: number;
    success: number;
    failed: number;
    skipped: number;
    languages: Record<string, LanguageStats>;
    startTime: string;
    endTime?: string;
    totalDuration?: number;
    error?: {
        message: string;
        time: string;
        stack?: string;
    };
}
interface TranslationOptions extends LocalizationConfig {
    targets: string[];
    forceUpdate?: boolean;
    debug?: boolean;
    progressOptions?: any;
}
/**
 * Main translator function
 */
export declare function translateFile(file: string, options: TranslationOptions): Promise<GlobalStats>;
/**
 * Find locale files
 */
export declare function findLocaleFiles(localesDir: string, sourceLang: string): Promise<string[]>;
/**
 * Validate and fix existing translations (simplified version)
 */
export declare function validateAndFixExistingTranslations(file: string, options: TranslationOptions): Promise<void>;
export {};
//# sourceMappingURL=translator.d.ts.map