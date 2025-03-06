const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

// Create axios instance with default config
const geminiClient = axios.create({
	baseURL: "https://generativelanguage.googleapis.com/v1beta",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.gemini?.model || "gemini-1.5-flash";
	const temperature = options.apiConfig?.gemini?.temperature || 0.3;
	const maxOutputTokens = options.apiConfig?.gemini?.maxTokens || 2048;

	// Check API key
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY environment variable not found");
	}

	const promptData = getPrompt("gemini", sourceLang, targetLang, text, options);

	// Çeviri işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			// Sending request to Gemini API endpoint
			const response = await geminiClient.post(
				`/models/${model}:generateContent`,
				{
					...promptData,
					generationConfig: {
						temperature,
						maxOutputTokens,
					},
				},
				{
					params: {
						key: apiKey,
					},
				}
			);

			// Validate response
			if (!response.data?.candidates || response.data.candidates.length === 0) {
				throw new Error("Failed to get translation candidate from Gemini API");
			}

			if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
				throw new Error("Invalid response format from Gemini API");
			}

			// Returning the first translation candidate
			return response.data.candidates[0].content.parts[0].text.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "Gemini Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const model = options.model || "gemini-1.5-flash";
	const temperature = options.temperature || 0.2;
	const maxOutputTokens = options.maxTokens || 1000;

	// Check API key
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY environment variable not found");
	}

	// Analiz şablonunu al
	const promptData = getAnalysisPrompt("gemini", prompt, options);

	// Analiz işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			// Format the analysis prompt for Gemini
			const response = await geminiClient.post(
				`/models/${model}:generateContent`,
				{
					...promptData,
					generationConfig: {
						temperature,
						maxOutputTokens,
					},
				},
				{
					params: {
						key: apiKey,
					},
				}
			);

			// Validate response
			if (!response.data?.candidates || response.data.candidates.length === 0) {
				throw new Error("Failed to get analysis result from Gemini API");
			}

			if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
				throw new Error("Invalid response format from Gemini API");
			}

			// Return the analysis result
			return response.data.candidates[0].content.parts[0].text.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "Gemini Provider",
		}
	);
}

module.exports = { translate, analyze };
