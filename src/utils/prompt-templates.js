const basePromptTemplate = (sourceLang, targetLang, options) => {
	const context = options.detectedContext || {
		category: "general",
		confidence: 1.0,
		prompt: "Provide a natural translation",
	};

	const contextInfo = `
Category: ${context.category} (${Math.round(context.confidence * 100)}% confidence)
Context Instructions: ${context.prompt}
`;

	const requirements = [
		"ONLY return the direct translation",
		"Preserve technical terms and placeholders",
		`Style: ${options.styleGuide.formality}, ${options.styleGuide.toneOfVoice}`,
		`Length Control: ${options.lengthControl?.mode || "flexible"}`,
	].filter(Boolean);

	return `
Translation Task: ${sourceLang} → ${targetLang}

${contextInfo}

Requirements:
${requirements.map((req) => `- ${req}`).join("\n")}

Text to Translate:
${options.text}
`;
};

const providerSpecificPrompts = {
	gemini: (sourceLang, targetLang, options, text) => ({
		contents: [
			{
				parts: [
					{
						text: `${basePromptTemplate(sourceLang, targetLang, options)}
Original Text: "${text}"`,
					},
				],
			},
		],
	}),

	openai: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),

	qwen: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),

	deepseek: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),

	azuredeepseek: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),

	xai: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),

	default: (sourceLang, targetLang, options) => ({
		messages: [
			{
				role: "system",
				content: basePromptTemplate(sourceLang, targetLang, options),
			},
			{
				role: "user",
				content: options.text,
			},
		],
	}),
};

module.exports = {
	getPrompt: (provider, sourceLang, targetLang, options) => {
		const promptGenerator =
			providerSpecificPrompts[provider] ||
			providerSpecificPrompts.default;
		return promptGenerator(sourceLang, targetLang, options);
	},
};
