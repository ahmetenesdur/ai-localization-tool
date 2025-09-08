interface QualityRuleOptions {
    placeholderConsistency?: boolean;
    htmlTagsConsistency?: boolean;
    punctuationCheck?: boolean;
    lengthValidation?: boolean;
    sanitizeOutput?: boolean;
    [key: string]: any;
}
interface StyleGuide {
    formality: string;
    toneOfVoice: string;
    [key: string]: any;
}
interface BaseCheckerOptions extends QualityRuleOptions {
    styleGuide?: StyleGuide;
}
interface Issue {
    type: string;
    message: string;
    timestamp: string;
    [key: string]: any;
}
interface ValidationResult {
    isValid: boolean;
    issues: Issue[];
}
interface FixResult {
    originalText: string;
    fixedText: string;
    isModified: boolean;
    issues: Issue[];
    fixes: Issue[];
}
declare class BaseChecker {
    protected rules: QualityRuleOptions;
    protected styleGuide: StyleGuide;
    constructor(options?: BaseCheckerOptions);
    createIssue(type: string, message: string, details?: Record<string, any>): Issue;
    createFix(type: string, message: string, details?: Record<string, any>): Issue;
    validate(sourceText: string, translatedText: string): ValidationResult;
    validateAndFix(sourceText: string, translatedText: string): FixResult;
}
export default BaseChecker;
export type { BaseChecker, BaseCheckerOptions, QualityRuleOptions, StyleGuide, Issue, ValidationResult, FixResult, };
//# sourceMappingURL=base-checker.d.ts.map