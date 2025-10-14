class BaseChecker {
	constructor(options = {}) {
		this.rules = {
			placeholderConsistency: true,
			htmlTagsConsistency: true,
			punctuationCheck: true,
			lengthValidation: true,
			sanitizeOutput: true,
			...options,
		};

		this.styleGuide = options.styleGuide || {
			formality: "neutral",
			toneOfVoice: "professional",
		};
	}

	createIssue(type, message, details = {}) {
		return {
			type,
			message,
			timestamp: new Date().toISOString(),
			...details,
		};
	}

	createFix(type, message, details = {}) {
		return {
			type,
			message,
			timestamp: new Date().toISOString(),
			...details,
		};
	}

	validate(sourceText, translatedText) {
		const issues = [];
		return {
			isValid: issues.length === 0,
			issues,
		};
	}

	validateAndFix(sourceText, translatedText) {
		return {
			originalText: translatedText,
			fixedText: translatedText,
			isModified: false,
			issues: [],
			fixes: [],
		};
	}
}

export default BaseChecker;
