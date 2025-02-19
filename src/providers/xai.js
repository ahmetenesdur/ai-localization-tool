const axios = require("axios");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.xai?.model || "grok-2-1212";
	const temperature = options.apiConfig?.xai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.xai?.maxTokens || 2000;

	const promptData = getPrompt("xai", sourceLang, targetLang, {
		...options,
		text,
	});

	try {
		const response = await axios.post(
			"https://api.x.ai/v1/chat/completions",
			{
				model,
				...promptData,
				temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.XAI_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("[X.AI Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(`[X.AI Provider] Translation failed: ${err.message}`);
	}
}

module.exports = { translate };
