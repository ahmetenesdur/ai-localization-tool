// lib/providers/openai.js
const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.openai?.model || "gpt-4o";
	const temperature = options.apiConfig?.openai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.openai?.maxTokens || 2000;

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Context: ${options.context}
		- Formality: ${options.styleGuide.formality}
		- Tone: ${options.styleGuide.toneOfVoice}
		${options.qualityChecks ? "- Apply quality control checks" : ""}`;

	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
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
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		return response.data.choices[0].message.content.trim();
	} catch (err) {
		console.error("OpenAI API error:", err.response?.data || err.message);
		throw new Error("Translation failed with OpenAI API");
	}
}

module.exports = { translate };
