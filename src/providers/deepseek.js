const axios = require("axios");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.deepseek?.model || "deepseek-chat";
	const temperature = options.apiConfig?.deepseek?.temperature || 0.3;
	const maxTokens = options.apiConfig?.deepseek?.maxTokens || 2000;

	try {
		const promptData = getPrompt(
			"deepseek",
			sourceLang,
			targetLang,
			text,
			options
		);

		const response = await axios.post(
			"https://api.deepseek.com/v1/chat/completions",
			{
				model,
				...promptData,
				temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("[DeepSeek Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(
			`[DeepSeek Provider] Translation failed: ${err.message}`
		);
	}
}

module.exports = { translate };
