const getLengthInstructions = (options) => {
	const {
		mode = "smart",
		lengthControl,
		targetLang,
		detectedContext,
	} = options;
	const context = detectedContext?.category || "general";

	if (mode === "smart") {
		const langRules =
			lengthControl.rules.smart.byLanguage[targetLang] || {};
		const contextRules = lengthControl.rules.smart.byContext[context] || {};

		return `TRANSLATION LENGTH REQUIREMENTS [${targetLang}]:
1. Maximum allowed length: ${(langRules.max || 0.15) * 100}% longer than source
2. Context-specific [${context}] limit: ${
			(contextRules.max || 0.15) * 100
		}% longer than source
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

const basePromptTemplate = (sourceLang, targetLang, text, options) => {
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

Style: ${options.styleGuide.formality}, ${options.styleGuide.toneOfVoice}

Text to Translate:
${text}`;
};

const providerSpecificPrompts = {
	gemini: (sourceLang, targetLang, text, options) => ({
		contents: [
			{
				parts: [
					{
						text: `${basePromptTemplate(
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
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
				content: basePromptTemplate(
					sourceLang,
					targetLang,
					text,
					options
				),
			},
			{
				role: "user",
				content: text,
			},
		],
	}),
};

module.exports = {
	getPrompt: (provider, sourceLang, targetLang, text, options) => {
		const promptGenerator =
			providerSpecificPrompts[provider] ||
			providerSpecificPrompts.default;
		return promptGenerator(sourceLang, targetLang, text, options);
	},
};
