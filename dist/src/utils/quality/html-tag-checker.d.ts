interface HtmlTagIssue {
    type: string;
    message: string;
    source?: string[];
    translated?: string[];
}
interface HtmlTagFixResult {
    text: string;
    foundIssues: HtmlTagIssue[];
    appliedFixes: HtmlTagIssue[];
}
declare class HtmlTagChecker {
    checkHtmlTags(source: string, translated: string): HtmlTagIssue[];
    fixHtmlTags(source: string, translated: string): HtmlTagFixResult;
    private insertHtmlTag;
}
export default HtmlTagChecker;
export type { HtmlTagChecker, HtmlTagIssue, HtmlTagFixResult };
//# sourceMappingURL=html-tag-checker.d.ts.map