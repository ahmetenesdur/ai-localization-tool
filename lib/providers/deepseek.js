// lib/providers/deepseek.js
const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.deepseek?.model || "deepseek-chat-r1";
	const temperature = options.apiConfig?.deepseek?.temperature || 0.2;

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Brand Name: ${options.brandName}
		- Brand Voice: ${options.brandVoice}
		- Context: ${options.context}
		- Domain: ${options.domainExpertise}
		- Tone: ${options.toneOfVoice}
		- Formality: ${options.formality}
		- Emotive Intent: ${options.emotiveIntent}
		- Length Control: ${options.lengthControl}
		${options.idioms ? "- Maintain idiomatic expressions" : ""}
		${options.inclusiveLanguage ? "- Use inclusive language" : ""}
		${options.qualityChecks ? "- Apply quality checks" : ""}`;

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
