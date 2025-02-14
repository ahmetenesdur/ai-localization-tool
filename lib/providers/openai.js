// lib/providers/openai.js
const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.openai?.model || "gpt-4-turbo-preview";
	const temperature = options.apiConfig?.openai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.openai?.maxTokens || 2000;

	const systemPrompt = `You are a professional translator specialized in ${
		options.domainExpertise || "general"
	} translations.
		Translate from ${sourceLang} to ${targetLang} maintaining these characteristics:
		- Brand Name: ${options.brandName}
		- Brand Voice: ${options.brandVoice}
		- Tone: ${options.toneOfVoice}
		- Formality: ${options.formality}
		- Length Control: ${options.lengthControl}
		- Domain: ${options.domainExpertise}
		- Context: ${options.context}
		- Emotive Intent: ${options.emotiveIntent}
		${
			options.idioms
				? "- Preserve idiomatic expressions with cultural equivalents"
				: ""
		}
		${options.inclusiveLanguage ? "- Ensure inclusive language usage" : ""}
		${options.qualityChecks ? "- Apply quality control checks" : ""}`;

	const messages = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: text },
	];

	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
			{
				model,
				messages,
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
