const axios = require("axios");

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.gemini?.model || "gemini-1.5-flash";
	const temperature = options.apiConfig?.gemini?.temperature || 0.3;
	const maxOutputTokens = options.apiConfig?.gemini?.maxTokens || 2048;

	// Check API key
	const apiKey = process.env.GOOGLE_API_KEY;
	if (!apiKey) {
		throw new Error("GOOGLE_API_KEY environment variable not found");
	}

	// Constructing structured prompt
	const prompt = {
		contents: [
			{
				parts: [
					{
						text: `Professional translation task from ${sourceLang} to ${targetLang}.
					Translation Parameters:
					- Context: ${options.context}
					- Formality: ${options.styleGuide.formality}
					- Tone: ${options.styleGuide.toneOfVoice}
					- Length Control: ${options.lengthControl?.mode || "flexible"}
					${options.qualityChecks ? "- Apply quality control measures" : ""}
					
					Original Text: "${text}"`,
					},
				],
			},
		],
	};

	try {
		// Sending request to Gemini API endpoint
		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
			{
				...prompt,
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
		console.error("Gemini API error:", err.response?.data || err.message);
		throw new Error("Translation failed with Gemini API");
	}
}

module.exports = { translate };
