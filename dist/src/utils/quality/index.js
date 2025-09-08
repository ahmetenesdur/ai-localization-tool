"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_checker_1 = __importDefault(require("./base-checker"));
const placeholder_checker_1 = __importDefault(require("./placeholder-checker"));
const html_tag_checker_1 = __importDefault(require("./html-tag-checker"));
const punctuation_checker_1 = __importDefault(require("./punctuation-checker"));
const length_checker_1 = __importDefault(require("./length-checker"));
const text_sanitizer_1 = __importDefault(require("./text-sanitizer"));
class QualityChecker extends base_checker_1.default {
    constructor(options = {}) {
        super(options);
        this.initializeCheckers();
        this.context = options.context || {};
    }
    initializeCheckers() {
        this.placeholderChecker = new placeholder_checker_1.default();
        this.htmlTagChecker = new html_tag_checker_1.default();
        this.punctuationChecker = new punctuation_checker_1.default();
        this.lengthChecker = new length_checker_1.default();
        this.textSanitizer = new text_sanitizer_1.default();
    }
    validate(sourceText, translatedText, options = {}) {
        const issues = [];
        if (this.rules.placeholderConsistency) {
            issues.push(...this.placeholderChecker.checkPlaceholders(sourceText, translatedText));
        }
        if (this.rules.htmlTagsConsistency) {
            issues.push(...this.htmlTagChecker.checkHtmlTags(sourceText, translatedText));
        }
        if (this.rules.punctuationCheck) {
            issues.push(...this.punctuationChecker.checkPunctuation(sourceText, translatedText));
        }
        if (this.rules.lengthValidation) {
            issues.push(...this.lengthChecker.checkLength(sourceText, translatedText, options));
        }
        if (this.rules.sanitizeOutput) {
            translatedText = this.sanitizeTranslation(translatedText);
        }
        return {
            isValid: issues.length === 0,
            issues,
            source: sourceText,
            translated: translatedText,
            context: this.context,
        };
    }
    validateAndFix(sourceText, translatedText, options = {}) {
        let fixedText = translatedText;
        const issues = [];
        const fixes = [];
        if (this.rules.sanitizeOutput) {
            fixedText = this.sanitizeTranslation(fixedText);
        }
        if (this.rules.placeholderConsistency) {
            const result = this.placeholderChecker.fixPlaceholders(sourceText, fixedText);
            fixedText = result.text;
            issues.push(...result.foundIssues);
            fixes.push(...result.appliedFixes);
        }
        if (this.rules.htmlTagsConsistency) {
            const result = this.htmlTagChecker.fixHtmlTags(sourceText, fixedText);
            fixedText = result.text;
            issues.push(...result.foundIssues);
            fixes.push(...result.appliedFixes);
        }
        if (this.rules.punctuationCheck) {
            const result = this.punctuationChecker.fixPunctuation(sourceText, fixedText);
            fixedText = result.text;
            issues.push(...result.foundIssues);
            fixes.push(...result.appliedFixes);
        }
        return {
            originalText: translatedText,
            fixedText,
            isModified: translatedText !== fixedText,
            issues,
            fixes,
            metadata: {
                sourceLength: sourceText.length,
                originalLength: translatedText.length,
                fixedLength: fixedText.length,
                timestamp: new Date().toISOString(),
            },
        };
    }
    sanitizeTranslation(text) {
        if (!text)
            return text;
        // First pass sanitization
        let sanitized = this.textSanitizer.sanitize(text);
        // Remove any remaining think tags
        if (sanitized.includes("```")) {
            sanitized = this.textSanitizer.removeThinkTags(sanitized);
        }
        // Final cleanup of duplicate lines
        sanitized = sanitized
            .split("\n")
            .filter((line, index, arr) => line !== arr[index - 1])
            .join("\n");
        return sanitized;
    }
}
exports.default = QualityChecker;
//# sourceMappingURL=index.js.map