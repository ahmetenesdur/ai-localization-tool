import BaseChecker, { BaseCheckerOptions } from "./base-checker";
interface QualityContext {
    [key: string]: any;
}
interface QualityValidationResult {
    isValid: boolean;
    issues: any[];
    source: string;
    translated: string;
    context: QualityContext;
}
interface QualityFixResult {
    originalText: string;
    fixedText: string;
    isModified: boolean;
    issues: any[];
    fixes: any[];
    metadata: {
        sourceLength: number;
        originalLength: number;
        fixedLength: number;
        timestamp: string;
    };
}
declare class QualityChecker extends BaseChecker {
    private placeholderChecker;
    private htmlTagChecker;
    private punctuationChecker;
    private lengthChecker;
    private textSanitizer;
    private context;
    constructor(options?: BaseCheckerOptions);
    private initializeCheckers;
    validate(sourceText: string, translatedText: string, options?: any): QualityValidationResult;
    validateAndFix(sourceText: string, translatedText: string, options?: any): QualityFixResult;
    private sanitizeTranslation;
}
export default QualityChecker;
//# sourceMappingURL=index.d.ts.map