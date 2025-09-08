interface PlaceholderIssue {
    type: string;
    message: string;
    source?: string[];
    translated?: string[];
}
interface PlaceholderFixResult {
    text: string;
    foundIssues: PlaceholderIssue[];
    appliedFixes: PlaceholderIssue[];
}
declare class PlaceholderChecker {
    checkPlaceholders(source: string, translated: string): PlaceholderIssue[];
    fixPlaceholders(source: string, translated: string): PlaceholderFixResult;
    private findBestPlaceholderPosition;
    private insertPlaceholder;
}
export default PlaceholderChecker;
export type { PlaceholderChecker, PlaceholderIssue, PlaceholderFixResult };
//# sourceMappingURL=placeholder-checker.d.ts.map