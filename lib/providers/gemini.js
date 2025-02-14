// lib/providers/gemini.js
const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.gemini?.model || "gemini-pro";
	const temperature = options.apiConfig?.gemini?.temperature || 0.3;

	const prompt = `Professional translation task from ${sourceLang} to ${targetLang}.
		Translation Parameters:
		- Brand Name: ${options.brandName}
		- Brand Voice: ${options.brandVoice}
		- Context: ${options.context}
		- Domain Expertise: ${options.domainExpertise}
		- Length Control: ${options.lengthControl}
		- Formality: ${options.formality}
		- Tone: ${options.toneOfVoice}
		- Emotive Intent: ${options.emotiveIntent}
		${options.idioms ? "- Handle idiomatic expressions appropriately" : ""}
		${options.inclusiveLanguage ? "- Maintain inclusive language" : ""}
		${options.qualityChecks ? "- Apply quality control measures" : ""}
		
		Original Text: "${text}"`;

	const contents = [
		{
			parts: [{ text: prompt }],
		},
	];

	try {
		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
			{ contents },
			{
				headers: {
					Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
					"Content-Type": "application/json",
				},
				params: {
					key: process.env.GOOGLE_API_KEY,
					temperature,
				},
			}
		);

		return response.data.candidates[0].content.parts[0].text.trim();
	} catch (err) {
		console.error("Gemini API error:", err.response?.data || err.message);
		throw new Error("Translation failed with Gemini API");
	}
}

module.exports = { translate };
