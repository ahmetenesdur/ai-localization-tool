/**
 * ENHANCED: Get length instructions with comprehensive input validation
 * @param options - Configuration options
 * @returns Length instructions for translation
 */
import type { TranslationOptions } from "@/types";

interface ContextInfo {
	category?: string;
	confidence?: number;
	prompt?: string;
	[key: string]: any;
}

const getLengthInstructions = (
	options: TranslationOptions & { targetLang?: string; detectedContext?: ContextInfo }
): string => {
	// FIXED: Enhanced input validation with null safety
	if (!options || typeof options !== "object") {
		console.warn("Invalid options provided to getLengthInstructions, using defaults");
		options = {};
	}

	const mode = (options as any).mode || "smart";
	const lengthControl = (options as any).lengthControl;
	const targetLang = (options as any).targetLang;
	const detectedContext = (options as any).detectedContext;

	// FIXED: More lenient targetLang validation - don't fail if missing
	if (!targetLang || typeof targetLang !== "string") {
		// Just return basic length instructions without failing
		return "TRANSLATION LENGTH: Keep translation concise and natural.";
	}

	const context = detectedContext?.category || "general";

	if (mode === "smart" && lengthControl?.rules?.smart) {
		// FIXED: Enhanced null safety for nested properties
		const langRules = lengthControl.rules.smart.byLanguage?.[targetLang] || {};
		const contextRules = lengthControl.rules.smart.byContext?.[context] || {};

		const langMax = typeof (langRules as any).max === "number" ? (langRules as any).max : 0.15;
		const contextMax =
			typeof (contextRules as any).max === "number" ? (contextRules as any).max : 0.15;

		return `TRANSLATION LENGTH REQUIREMENTS [${targetLang}]:
1. Maximum allowed length: ${Math.round(langMax * 100)}% longer than source
2. Context-specific [${context}] limit: ${Math.round(contextMax * 100)}% longer than source
3. Shorter translations are preferred when possible
4. Maintain semantic completeness while being concise`;
	}

	// FIXED: Enhanced templates with null safety for length control rules
	const templates: Record<string, () => string> = {
		strict: () => {
			const strictLimit = lengthControl?.rules?.strict;
			const limit = typeof strictLimit === "number" ? strictLimit : 1.0;
			return `CRITICAL: Translation must not exceed ${Math.round(limit * 100)}% of source length. Prefer shorter translations.`;
		},
		flexible: () => {
			const flexibleLimit = lengthControl?.rules?.flexible;
			const limit = typeof flexibleLimit === "number" ? flexibleLimit : 1.2;
			return `IMPORTANT: Keep translation concise. Target length should not exceed source length by more than ${Math.round(limit * 100)}%.`;
		},
		exact: () => {
			const exactLimit = lengthControl?.rules?.exact;
			const limit = typeof exactLimit === "number" ? exactLimit : 1.05;
			return `STRICT: Translation must closely match source length (max ${Math.round(limit * 100)}% deviation).`;
		},
		relaxed: () => {
			const relaxedLimit = lengthControl?.rules?.relaxed;
			const limit = typeof relaxedLimit === "number" ? relaxedLimit : 1.5;
			return `GUIDELINE: Translation should be concise but can be up to ${Math.round(limit * 100)}% longer if needed.`;
		},
	};

	// FIXED: Safe template access with fallback
	const templateFn = templates[mode];
	if (typeof templateFn === "function") {
		try {
			return templateFn();
		} catch (error: any) {
			console.warn(`Error generating length template for mode ${mode}:`, error.message);
		}
	}

	// Fallback for invalid mode or errors
	return "TRANSLATION LENGTH: Keep translation concise and natural.";
};

/**
 * ENHANCED: Base translation prompt template with comprehensive input validation
 * @param sourceLang - Source language code
 * @param targetLang - Target language code
 * @param text - Text to translate
 * @param options - Translation options
 * @returns Generated prompt template
 */
const baseTranslationPromptTemplate = (
	sourceLang: string,
	targetLang: string,
	text: string,
	options: TranslationOptions
): string => {
	// FIXED: Enhanced input validation for all parameters
	if (!sourceLang || typeof sourceLang !== "string") {
		console.warn("Invalid sourceLang provided to baseTranslationPromptTemplate");
		sourceLang = "en";
	}

	if (!targetLang || typeof targetLang !== "string") {
		console.warn("Invalid targetLang provided to baseTranslationPromptTemplate");
		targetLang = "es";
	}

	if (typeof text !== "string") {
		console.warn("Invalid text provided to baseTranslationPromptTemplate");
		text = "";
	}

	if (!options || typeof options !== "object") {
		console.warn("Invalid options provided to baseTranslationPromptTemplate, using defaults");
		options = {};
	}

	// FIXED: Safe context extraction with defaults
	const context =
		options.detectedContext && typeof options.detectedContext === "object"
			? options.detectedContext
			: {
					category: "general",
					confidence: 1.0,
					prompt: "Provide a natural translation",
				};

	// Ensure context properties are safe
	const safeContext = {
		category: context.category || "general",
		confidence: typeof context.confidence === "number" ? context.confidence : 1.0,
		prompt: (context as any).prompt || "Provide a natural translation",
		existingTranslation: (context as any).existingTranslation,
	};

	const lengthInstructions = getLengthInstructions({
		...options,
		targetLang: targetLang, // Pass targetLang explicitly
		detectedContext: safeContext, // Also pass context
	});

	let additionalInstructions = "";
	if (safeContext.existingTranslation && typeof safeContext.existingTranslation === "string") {
		// FIXED: Truncate long existing translations to prevent prompt bloat
		const truncatedTranslation =
			safeContext.existingTranslation.length > 200
				? safeContext.existingTranslation.substring(0, 200) + "..."
				: safeContext.existingTranslation;
		additionalInstructions = `\nREVISION REQUEST: The existing translation "${truncatedTranslation}" has length issues. Please provide a corrected version that matches the source text length requirements.`;
	}

	// FIXED: Safe style guide access with defaults
	const formality = (options as any).styleGuide?.formality || "neutral";
	const toneOfVoice = (options as any).styleGuide?.toneOfVoice || "professional";

	return `
Translation Task: ${sourceLang} → ${targetLang}
${additionalInstructions}

Category: ${safeContext.category}
Context Instructions: ${safeContext.prompt}

LENGTH CONTROL:
${lengthInstructions}

STRICT OUTPUT REQUIREMENTS:
1. RETURN ONLY THE TRANSLATED TEXT
2. NO EXPLANATIONS OR COMMENTARY
3. NO \`\`\` BLOCKS OR MARKDOWN
4. NO QUOTES OR FORMATTING
5. PRESERVE TECHNICAL TERMS AND PLACEHOLDERS

Style: ${formality}, ${toneOfVoice}

Text to Translate:
${text}`;
};

/**
 * ENHANCED: Base analysis prompt template with comprehensive input validation
 * @param text - Text to analyze
 * @param options - Analysis options
 * @returns Generated analysis prompt
 */
const baseAnalysisPromptTemplate = (text: string, options: any = {}): string => {
	if (typeof text !== "string") {
		console.warn("Invalid text provided to baseAnalysisPromptTemplate");
		text = "";
	}

	if (!options || typeof options !== "object") {
		console.warn("Invalid options provided to baseAnalysisPromptTemplate, using defaults");
		options = {};
	}

	let categories = "technical, marketing, legal, defi, ui, general";
	if (options.categories && typeof options.categories === "object") {
		try {
			const categoryKeys = Object.keys(options.categories);
			if (Array.isArray(categoryKeys) && categoryKeys.length > 0) {
				categories = categoryKeys.join(", ");
			}
		} catch (error: any) {
			console.warn("Error processing categories:", error.message);
		}
	}

	const maxTextLength = 1500;
	const truncatedText =
		text.length > maxTextLength ? text.substring(0, maxTextLength) + "..." : text;

	const allowNewCategories = options.allowNewCategories === true;
	const categoryNote = allowNewCategories
		? ", or suggest a new category if none of these fit"
		: "";

	return `
TASK: Analyze the following text and determine its context category.

TEXT TO ANALYZE:
"""
${truncatedText}
"""

AVAILABLE CATEGORIES: ${categories}${categoryNote}

INSTRUCTIONS:
1. Identify the primary context category of the text
2. Provide a confidence score (0.0-1.0)
3. Suggest 3-5 keywords that are relevant to this text
4. Provide a brief explanation of your categorization

FORMAT YOUR RESPONSE AS JSON:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "explanation": "Brief explanation of why this category was chosen"
}
`;
};

// Provider-specific templates for translation
const translationPrompts: Record<
	string,
	(sourceLang: string, targetLang: string, text: string, options: TranslationOptions) => any
> = {
	gemini: (sourceLang, targetLang, text, options) => ({
		contents: [
			{
				parts: [
					{
						text: `${baseTranslationPromptTemplate(
							sourceLang,
							targetLang,
							text,
							options
						)}
Original Text: "${text}"`,
					},
				],
			},
		],
	}),

	openai: (sourceLang, targetLang, text, options) => ({
		messages: [
			{
				role: "system",
				content: baseTranslationPromptTemplate(sourceLang, targetLang, text, options),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),

	dashscope: (sourceLang, targetLang, text, options) => ({
		messages: [
			{
				role: "system",
				content: baseTranslationPromptTemplate(sourceLang, targetLang, text, options),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),

	deepseek: (sourceLang, targetLang, text, options) => ({
		messages: [
			{
				role: "system",
				content: baseTranslationPromptTemplate(sourceLang, targetLang, text, options),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),

	xai: (sourceLang, targetLang, text, options) => ({
		messages: [
			{
				role: "system",
				content: baseTranslationPromptTemplate(sourceLang, targetLang, text, options),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),

	default: (sourceLang, targetLang, text, options) => ({
		messages: [
			{
				role: "system",
				content: baseTranslationPromptTemplate(sourceLang, targetLang, text, options),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),
};

// Provider-specific templates for analysis
const analysisPrompts: Record<string, (text: string, options: any) => any> = {
	gemini: (text, options) => ({
		contents: [
			{
				parts: [
					{
						text: baseAnalysisPromptTemplate(text, options),
					},
				],
			},
		],
	}),

	openai: (text, options) => ({
		messages: [
			{
				role: "system",
				content:
					"You are a context analysis assistant that helps identify the category and context of text.",
			},
			{
				role: "user",
				content: baseAnalysisPromptTemplate(text, options),
			},
		],
	}),

	dashscope: (text, options) => ({
		model: options.model || "qwen-plus",
		input: {
			messages: [
				{
					role: "system",
					content:
						"You are a context analysis assistant that helps identify the category and context of text.",
				},
				{
					role: "user",
					content: baseAnalysisPromptTemplate(text, options),
				},
			],
		},
		parameters: {
			temperature: options.temperature || 0.2,
			max_tokens: options.maxTokens || 1000,
		},
	}),

	deepseek: (text, options) => ({
		messages: [
			{
				role: "system",
				content:
					"You are a context analysis assistant that helps identify the category and context of text.",
			},
			{
				role: "user",
				content: baseAnalysisPromptTemplate(text, options),
			},
		],
	}),

	xai: (text, options) => ({
		messages: [
			{
				role: "system",
				content:
					"You are a context analysis assistant that helps identify the category and context of text.",
			},
			{
				role: "user",
				content: baseAnalysisPromptTemplate(text, options),
			},
		],
	}),

	default: (text, options) => ({
		messages: [
			{
				role: "system",
				content:
					"You are a context analysis assistant that helps identify the category and context of text.",
			},
			{
				role: "user",
				content: baseAnalysisPromptTemplate(text, options),
			},
		],
	}),
};

export interface PromptTemplates {
	/**
	 * ENHANCED: Get translation prompt with comprehensive input validation
	 * @param provider - Translation provider name
	 * @param sourceLang - Source language code
	 * @param targetLang - Target language code
	 * @param text - Text to translate
	 * @param options - Translation options
	 * @returns Generated prompt for the specified provider
	 */
	getPrompt: (
		provider: string,
		sourceLang: string,
		targetLang: string,
		text: string,
		options: TranslationOptions
	) => any;

	/**
	 * ENHANCED: Get analysis prompt with comprehensive input validation
	 * @param provider - Analysis provider name
	 * @param text - Text to analyze
	 * @param options - Analysis options
	 * @returns Generated analysis prompt for the specified provider
	 */
	getAnalysisPrompt: (provider: string, text: string, options?: any) => any;
}

export const promptTemplates: PromptTemplates = {
	/**
	 * ENHANCED: Get translation prompt with comprehensive input validation
	 * @param provider - Translation provider name
	 * @param sourceLang - Source language code
	 * @param targetLang - Target language code
	 * @param text - Text to translate
	 * @param options - Translation options
	 * @returns Generated prompt for the specified provider
	 */
	getPrompt: (provider, sourceLang, targetLang, text, options) => {
		// FIXED: Enhanced input validation for all parameters
		if (!provider || typeof provider !== "string") {
			console.warn("Invalid provider provided to getPrompt, using default");
			provider = "default";
		}

		if (!sourceLang || typeof sourceLang !== "string") {
			console.warn("Invalid sourceLang provided to getPrompt, using en");
			sourceLang = "en";
		}

		if (!targetLang || typeof targetLang !== "string") {
			console.warn("Invalid targetLang provided to getPrompt, using es");
			targetLang = "es";
		}

		if (typeof text !== "string") {
			console.warn("Invalid text provided to getPrompt, using empty string");
			text = "";
		}

		if (!options || typeof options !== "object") {
			console.warn("Invalid options provided to getPrompt, using defaults");
			options = {};
		}

		// FIXED: Safe provider access with fallback
		const promptGenerator = translationPrompts[provider] || translationPrompts.default;

		try {
			// Fix: Check if promptGenerator is a function before calling it
			if (promptGenerator && typeof promptGenerator === "function") {
				return promptGenerator(sourceLang, targetLang, text, options);
			} else if (
				translationPrompts.default &&
				typeof translationPrompts.default === "function"
			) {
				// Fallback to default provider
				return translationPrompts.default(sourceLang, targetLang, text, options);
			} else {
				// If even default is not available, return a basic structure
				return {
					messages: [
						{
							role: "system",
							content: "Translation prompt",
						},
						{
							role: "user",
							content: text,
						},
					],
				};
			}
		} catch (error: any) {
			console.error(`Error generating prompt for provider ${provider}:`, error.message);
			// Fallback to default provider
			if (translationPrompts.default && typeof translationPrompts.default === "function") {
				return translationPrompts.default(sourceLang, targetLang, text, options);
			} else {
				// If even default is not available, return a basic structure
				return {
					messages: [
						{
							role: "system",
							content: "Translation prompt",
						},
						{
							role: "user",
							content: text,
						},
					],
				};
			}
		}
	},

	/**
	 * ENHANCED: Get analysis prompt with comprehensive input validation
	 * @param provider - Analysis provider name
	 * @param text - Text to analyze
	 * @param options - Analysis options
	 * @returns Generated analysis prompt for the specified provider
	 */
	getAnalysisPrompt: (provider, text, options = {}) => {
		// FIXED: Enhanced input validation
		if (!provider || typeof provider !== "string") {
			console.warn("Invalid provider provided to getAnalysisPrompt, using default");
			provider = "default";
		}

		if (typeof text !== "string") {
			console.warn("Invalid text provided to getAnalysisPrompt, using empty string");
			text = "";
		}

		if (!options || typeof options !== "object") {
			console.warn("Invalid options provided to getAnalysisPrompt, using defaults");
			options = {};
		}

		// FIXED: Safe provider access with fallback
		const promptGenerator = analysisPrompts[provider] || analysisPrompts.default;

		try {
			// Fix: Check if promptGenerator is a function before calling it
			if (promptGenerator && typeof promptGenerator === "function") {
				return promptGenerator(text, options);
			} else if (analysisPrompts.default && typeof analysisPrompts.default === "function") {
				// Fallback to default provider
				return analysisPrompts.default(text, options);
			} else {
				// If even default is not available, return a basic structure
				return {
					messages: [
						{
							role: "system",
							content: "Analysis prompt",
						},
						{
							role: "user",
							content: text,
						},
					],
				};
			}
		} catch (error: any) {
			console.error(
				`Error generating analysis prompt for provider ${provider}:`,
				error.message
			);
			// Fallback to default provider
			if (analysisPrompts.default && typeof analysisPrompts.default === "function") {
				return analysisPrompts.default(text, options);
			} else {
				// If even default is not available, return a basic structure
				return {
					messages: [
						{
							role: "system",
							content: "Analysis prompt",
						},
						{
							role: "user",
							content: text,
						},
					],
				};
			}
		}
	},
};

export default promptTemplates;
