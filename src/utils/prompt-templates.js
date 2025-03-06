const getLengthInstructions = (options) => {
	const { mode = "smart", lengthControl, targetLang, detectedContext } = options;
	const context = detectedContext?.category || "general";

	if (mode === "smart") {
		const langRules = lengthControl.rules.smart.byLanguage[targetLang] || {};
		const contextRules = lengthControl.rules.smart.byContext[context] || {};

		return `TRANSLATION LENGTH REQUIREMENTS [${targetLang}]:
1. Maximum allowed length: ${(langRules.max || 0.15) * 100}% longer than source
2. Context-specific [${context}] limit: ${(contextRules.max || 0.15) * 100}% longer than source
3. Shorter translations are preferred when possible
4. Maintain semantic completeness while being concise`;
	}

	const templates = {
		strict: () =>
			`CRITICAL: Translation must not exceed ${
				lengthControl.rules.strict * 100
			}% of source length. Prefer shorter translations.`,
		flexible: () =>
			`IMPORTANT: Keep translation concise. Target length should not exceed source length by more than ${
				lengthControl.rules.flexible * 100
			}%.`,
		exact: () =>
			`STRICT: Translation must closely match source length (max ${
				lengthControl.rules.exact * 100
			}% deviation).`,
		relaxed: () =>
			`GUIDELINE: Translation should be concise but can be up to ${
				lengthControl.rules.relaxed * 100
			}% longer if needed.`,
	};

	return (templates[mode] || templates.smart)();
};

// Çeviri için temel şablon
const baseTranslationPromptTemplate = (sourceLang, targetLang, text, options) => {
	const context = options.detectedContext || {
		category: "general",
		confidence: 1.0,
		prompt: "Provide a natural translation",
	};

	const lengthInstructions = getLengthInstructions(options);

	let additionalInstructions = "";
	if (context.existingTranslation) {
		additionalInstructions = `\nREVISION REQUEST: The existing translation "${context.existingTranslation}" has length issues. Please provide a corrected version that matches the source text length requirements.`;
	}

	return `
Translation Task: ${sourceLang} → ${targetLang}
${additionalInstructions}

Category: ${context.category}
Context Instructions: ${context.prompt}

LENGTH CONTROL:
${lengthInstructions}

STRICT OUTPUT REQUIREMENTS:
1. RETURN ONLY THE TRANSLATED TEXT
2. NO EXPLANATIONS OR COMMENTARY
3. NO <think> BLOCKS OR MARKDOWN
4. NO QUOTES OR FORMATTING
5. PRESERVE TECHNICAL TERMS AND PLACEHOLDERS

Style: ${options.styleGuide?.formality || "neutral"}, ${options.styleGuide?.toneOfVoice || "professional"}

Text to Translate:
${text}`;
};

// Analiz için temel şablon
const baseAnalysisPromptTemplate = (text, options = {}) => {
	const categories = options.categories
		? Object.keys(options.categories).join(", ")
		: "technical, marketing, legal, defi, ui, general";

	return `
TASK: Analyze the following text and determine its context category.

TEXT TO ANALYZE:
"""
${text.length > 1500 ? text.substring(0, 1500) + "..." : text}
"""

AVAILABLE CATEGORIES: ${categories}${options.allowNewCategories ? ", or suggest a new category if none of these fit" : ""}

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

// Çeviri için sağlayıcıya özel şablonlar
const translationPrompts = {
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

	azuredeepseek: (sourceLang, targetLang, text, options) => ({
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

// Analiz için sağlayıcıya özel şablonlar
const analysisPrompts = {
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

	azuredeepseek: (text, options) => ({
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

module.exports = {
	// Çeviri şablonları için fonksiyon
	getPrompt: (provider, sourceLang, targetLang, text, options) => {
		const promptGenerator = translationPrompts[provider] || translationPrompts.default;
		return promptGenerator(sourceLang, targetLang, text, options);
	},

	// Analiz şablonları için fonksiyon
	getAnalysisPrompt: (provider, text, options = {}) => {
		const promptGenerator = analysisPrompts[provider] || analysisPrompts.default;
		return promptGenerator(text, options);
	},
};
