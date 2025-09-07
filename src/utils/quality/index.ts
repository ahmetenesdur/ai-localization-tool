import BaseChecker, { BaseCheckerOptions } from "./base-checker";
import PlaceholderChecker from "./placeholder-checker";
import HtmlTagChecker from "./html-tag-checker";
import PunctuationChecker from "./punctuation-checker";
import LengthChecker from "./length-checker";
import TextSanitizer from "./text-sanitizer";

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

class QualityChecker extends BaseChecker {
	private placeholderChecker!: PlaceholderChecker;
	private htmlTagChecker!: HtmlTagChecker;
	private punctuationChecker!: PunctuationChecker;
	private lengthChecker!: LengthChecker;
	private textSanitizer!: TextSanitizer;
	private context: QualityContext;

	constructor(options: BaseCheckerOptions = {}) {
		super(options);
		this.initializeCheckers();
		this.context = options.context || {};
	}

	private initializeCheckers(): void {
		this.placeholderChecker = new PlaceholderChecker();
		this.htmlTagChecker = new HtmlTagChecker();
		this.punctuationChecker = new PunctuationChecker();
		this.lengthChecker = new LengthChecker();
		this.textSanitizer = new TextSanitizer();
	}

	validate(
		sourceText: string,
		translatedText: string,
		options: any = {}
	): QualityValidationResult {
		const issues: any[] = [];

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

	validateAndFix(
		sourceText: string,
		translatedText: string,
		options: any = {}
	): QualityFixResult {
		let fixedText = translatedText;
		const issues: any[] = [];
		const fixes: any[] = [];

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

	private sanitizeTranslation(text: string): string {
		if (!text) return text;

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

export default QualityChecker;
