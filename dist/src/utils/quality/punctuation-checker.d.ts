interface PunctuationIssue {
    type: string;
    message: string;
}
interface PunctuationFixResult {
    text: string;
    foundIssues: PunctuationIssue[];
    appliedFixes: PunctuationIssue[];
}
declare class PunctuationChecker {
    checkPunctuation(source: string, translated: string): PunctuationIssue[];
    fixPunctuation(source: string, translated: string): PunctuationFixResult;
    private addPunctuation;
}
export default PunctuationChecker;
export type { PunctuationChecker, PunctuationIssue, PunctuationFixResult };
//# sourceMappingURL=punctuation-checker.d.ts.map