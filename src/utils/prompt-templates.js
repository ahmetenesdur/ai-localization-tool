const basePromptTemplate = (sourceLang, targetLang, options) => {
	const context = options.detectedContext || {
		category: "general",
		confidence: 1.0,
		prompt: "",
	};

	const requirements = [
		"ONLY return the direct translation without any additional text",
		"DO NOT include any explanations or thinking process",
		"DO NOT use markdown formatting",
		"DO NOT add any prefixes or labels",
		"DO NOT wrap output in quotes or tags",
		"Strictly preserve placeholders like {variable}",
		`Translation Context: ${context.category} (${Math.round(context.confidence * 100)}% confidence)`,
		context.prompt,
		`Formality: ${options.styleGuide.formality}`,
		`Tone: ${options.styleGuide.toneOfVoice}`,
		`Length Control: ${options.lengthControl?.mode || "flexible"}`,
		options.qualityChecks ? "Apply quality control checks" : null,
	].filter(Boolean);

	return `Professional translation from ${sourceLang} to ${targetLang}.
Translation Requirements:
${requirements.map((req) => `- ${req}`).join("\n")}`;
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
