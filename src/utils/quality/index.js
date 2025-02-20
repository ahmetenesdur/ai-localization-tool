const BaseChecker = require("./base-checker");
const PlaceholderChecker = require("./placeholder-checker");
const HtmlTagChecker = require("./html-tag-checker");
const PunctuationChecker = require("./punctuation-checker");
const LengthChecker = require("./length-checker");
const TextSanitizer = require("./text-sanitizer");

class QualityChecker extends BaseChecker {
	constructor(options = {}) {
		super(options);
		this.initializeCheckers();
		this.context = options.context || {};
	}

	initializeCheckers() {
		this.placeholderChecker = new PlaceholderChecker();
		this.htmlTagChecker = new HtmlTagChecker();
		this.punctuationChecker = new PunctuationChecker();
		this.lengthChecker = new LengthChecker();
		this.textSanitizer = new TextSanitizer();
	}

	validate(sourceText, translatedText, options = {}) {
		const issues = [];

		if (this.rules.placeholderConsistency) {
			issues.push(
				...this.placeholderChecker.checkPlaceholders(
					sourceText,
					translatedText
				)
			);
		}

		if (this.rules.htmlTagsConsistency) {
			issues.push(
				...this.htmlTagChecker.checkHtmlTags(sourceText, translatedText)
			);
		}

		if (this.rules.punctuationCheck) {
			issues.push(
				...this.punctuationChecker.checkPunctuation(
					sourceText,
					translatedText
				)
			);
		}

		if (this.rules.lengthValidation) {
			issues.push(
				...this.lengthChecker.checkLength(
					sourceText,
					translatedText,
					options
				)
			);
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
			const result = this.placeholderChecker.fixPlaceholders(
				sourceText,
				fixedText
			);
			fixedText = result.text;
			issues.push(...result.foundIssues);
			fixes.push(...result.appliedFixes);
		}

		if (this.rules.htmlTagsConsistency) {
			const result = this.htmlTagChecker.fixHtmlTags(
				sourceText,
				fixedText
			);
			fixedText = result.text;
			issues.push(...result.foundIssues);
			fixes.push(...result.appliedFixes);
		}

		if (this.rules.punctuationCheck) {
			const result = this.punctuationChecker.fixPunctuation(
				sourceText,
				fixedText
			);
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
		return this.textSanitizer.sanitize(text);
	}
}

module.exports = QualityChecker;
