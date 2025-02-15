const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.deepseek?.model || "deepseek-chat";
	const temperature = options.apiConfig?.deepseek?.temperature || 0.3;
	const maxTokens = options.apiConfig?.deepseek?.maxTokens || 2000;

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Context: ${options.context}
		- Formality: ${options.styleGuide.formality}
		- Tone: ${options.styleGuide.toneOfVoice}
		- Length Control: ${options.lengthControl?.mode || "flexible"}
		${options.qualityChecks ? "- Apply quality control checks" : ""}`;

	try {
		const response = await axios.post(
			"https://api.deepseek.com/v1/chat/completions",
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
					Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("DeepSeek API error:", err.response?.data || err.message);
		throw new Error("Translation failed with DeepSeek API");
	}
}

module.exports = { translate };
