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

class BaseChecker {
	protected rules: QualityRuleOptions;
	protected styleGuide: StyleGuide;

	constructor(options: BaseCheckerOptions = {}) {
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

	createIssue(type: string, message: string, details: Record<string, any> = {}): Issue {
		return {
			type,
			message,
			timestamp: new Date().toISOString(),
			...details,
		};
	}

	createFix(type: string, message: string, details: Record<string, any> = {}): Issue {
		return {
			type,
			message,
			timestamp: new Date().toISOString(),
			...details,
		};
	}

	validate(sourceText: string, translatedText: string): ValidationResult {
		const issues: Issue[] = [];
		return {
			isValid: issues.length === 0,
			issues,
		};
	}

	validateAndFix(sourceText: string, translatedText: string): FixResult {
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
export type {
	BaseChecker,
	BaseCheckerOptions,
	QualityRuleOptions,
	StyleGuide,
	Issue,
	ValidationResult,
	FixResult,
};
