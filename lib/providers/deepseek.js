// lib/providers/deepseek.js
const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.deepseek?.model || "deepseek-chat";
	const temperature = options.apiConfig?.deepseek?.temperature || 0.3;

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Context: ${options.context}
		- Formality: ${options.styleGuide.formality}
		- Tone: ${options.styleGuide.toneOfVoice}
		${options.qualityChecks ? "- Apply quality control checks" : ""}`;

	const messages = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: text },
	];

	try {
		const response = await axios.post(
			"https://api.deepseek.com/v1/chat/completions",
			{
				model,
				messages,
				temperature,
				max_tokens: 2000,
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
