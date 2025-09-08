interface LengthControlRules {
    strict?: number;
    flexible?: number;
    exact?: number;
    relaxed?: number;
    smart?: {
        default?: number;
        byLanguage?: Record<string, {
            max?: number;
            min?: number;
        }>;
        byContext?: Record<string, {
            max?: number;
            min?: number;
        }>;
    };
}
interface LengthControlConfig {
    mode?: string;
    rules?: LengthControlRules;
}
interface TranslationOptions {
    lengthControl?: LengthControlConfig;
    targetLang?: string;
    detectedContext?: {
        category?: string;
    };
    [key: string]: any;
}
interface LengthConfig {
    mode: string;
    targetLang: string;
    context: string;
    maxDeviation: number;
    minDeviation: number;
}
interface AllowedRange {
    minRatio: number;
    maxRatio: number;
}
interface LengthIssue {
    type: string;
    severity: string;
    message: string;
    details: {
        mode: string;
        context: string;
        targetLang: string;
        sourceLength: number;
        translatedLength: number;
        ratio: number;
        allowedRange: {
            min: number;
            max: number;
        };
        deviation: number;
        error?: string;
    };
}
declare class LengthChecker {
    private defaultConfig;
    constructor();
    checkLength(source: string, translated: string, options?: TranslationOptions): LengthIssue[];
    private calculateLength;
    private getConfig;
    private getSmartModeConfig;
    private getStandardModeConfig;
    private calculateAllowedRange;
    private determineSeverity;
    private generateErrorMessage;
}
export default LengthChecker;
export type { LengthChecker, LengthControlConfig, TranslationOptions, LengthConfig, AllowedRange, LengthIssue, };
//# sourceMappingURL=length-checker.d.ts.map