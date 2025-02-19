const basePromptTemplate = (sourceLang, targetLang, text, options) => {
	const context = options.detectedContext || {
		category: "general",
		confidence: 1.0,
		prompt: "Provide a natural translation",
	};

	return `
Translation Task: ${sourceLang} → ${targetLang}

Category: ${context.category}
Context Instructions: ${context.prompt}

STRICT OUTPUT REQUIREMENTS:
1. RETURN ONLY THE TRANSLATED TEXT
2. NO EXPLANATIONS OR COMMENTARY
3. NO <think> BLOCKS OR MARKDOWN
4. NO QUOTES OR FORMATTING
5. PRESERVE TECHNICAL TERMS AND PLACEHOLDERS

Style: ${options.styleGuide.formality}, ${options.styleGuide.toneOfVoice}
Length Control: ${options.lengthControl?.mode || "flexible"}

Text to Translate:
${text}`;
};

const providerSpecificPrompts = {
	gemini: (sourceLang, targetLang, text, options) => ({
		contents: [
			{
				parts: [
					{
						text: `${basePromptTemplate(sourceLang, targetLang, text, options)}
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

	qwen: (sourceLang, targetLang, text, options) => ({
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
