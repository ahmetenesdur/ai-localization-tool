const axios = require("axios");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.gemini?.model || "gemini-1.5-flash";
	const temperature = options.apiConfig?.gemini?.temperature || 0.3;
	const maxOutputTokens = options.apiConfig?.gemini?.maxTokens || 2048;

	// Check API key
	const apiKey = process.env.GOOGLE_API_KEY;
	if (!apiKey) {
		throw new Error("GOOGLE_API_KEY environment variable not found");
	}

	const promptData = getPrompt("gemini", sourceLang, targetLang, {
		...options,
		text,
	});

	try {
		// Sending request to Gemini API endpoint
		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
			{
				...promptData,
				generationConfig: {
					temperature,
					maxOutputTokens,
				},
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
				params: {
					key: apiKey,
				},
			}
		);

		// Checking and processing API response
		if (
			!response.data.candidates ||
			response.data.candidates.length === 0
		) {
			throw new Error("Failed to get translation candidate");
		}

		// Returning the first translation candidate
		return response.data.candidates[0].content.parts[0].text.trim();
	} catch (err) {
		console.error("[Gemini Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(`[Gemini Provider] Translation failed: ${err.message}`);
	}
}

module.exports = { translate };
