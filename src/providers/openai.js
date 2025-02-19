const axios = require("axios");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.openai?.model || "gpt-4o";
	const temperature = options.apiConfig?.openai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.openai?.maxTokens || 2000;

	const promptData = getPrompt(
		"openai",
		sourceLang,
		targetLang,
		text,
		options
	);

	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
			{
				model,
				...promptData,
				temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("[OpenAI Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(`[OpenAI Provider] Translation failed: ${err.message}`);
	}
}

module.exports = { translate };
