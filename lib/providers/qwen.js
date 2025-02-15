const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.qwen?.model || "qwen-plus";
	const temperature = options.apiConfig?.qwen?.temperature || 0.3;
	const maxTokens = options.apiConfig?.qwen?.maxTokens || 2000;

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Context: ${options.context}
		- Formality: ${options.styleGuide.formality}
		- Tone: ${options.styleGuide.toneOfVoice}
		${options.qualityChecks ? "- Apply quality checks" : ""}`;

	try {
		const response = await axios.post(
			"https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
			{
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: text },
				],
				temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("Qwen API error:", err.response?.data || err.message);
		throw new Error("Translation failed with Qwen API");
	}
}

module.exports = { translate };
