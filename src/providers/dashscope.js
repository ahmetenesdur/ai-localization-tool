const axios = require("axios");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.dashscope?.model || "qwen-plus";
	const temperature = options.apiConfig?.dashscope?.temperature || 0.3;
	const maxTokens = options.apiConfig?.dashscope?.maxTokens || 2000;

	const promptData = getPrompt(
		"dashscope",
		sourceLang,
		targetLang,
		text,
		options
	);

	try {
		const response = await axios.post(
			"https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
			{
				model,
				...promptData,
				temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("[Dashscope Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(
			`[Dashscope Provider] Translation failed: ${err.message}`
		);
	}
}

module.exports = { translate };
