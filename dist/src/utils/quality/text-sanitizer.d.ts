declare class TextSanitizer {
    sanitize(text: string): string;
    private applyRules;
    removeThinkTags(text: string): string;
    private removeMarkdownFormatting;
    private removeQuotes;
    private removeBulletPoints;
    private removeExplanations;
    private removeAIArtifacts;
    private trimSpecialChars;
    private normalizeWhitespace;
    removeAllArtifacts(text: string): string;
}
export default TextSanitizer;
//# sourceMappingURL=text-sanitizer.d.ts.map