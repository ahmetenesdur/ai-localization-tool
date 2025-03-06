const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

// Create axios instance with default config
const xaiClient = axios.create({
	baseURL: "https://api.x.ai/v1",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.xai?.model || "grok-2-1212";
	const temperature = options.apiConfig?.xai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.xai?.maxTokens || 2000;

	const promptData = getPrompt("xai", sourceLang, targetLang, text, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.XAI_API_KEY}`,
	};

	// Yeniden deneme ile API çağrısını yap
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await xaiClient.post(
				"/chat/completions",
				{
					model,
					...promptData,
					temperature,
					max_tokens: maxTokens,
				},
				{ headers }
			);

			// Validate response
			if (!response.data?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from X.AI API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "X.AI Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const model = options.model || "grok-2-1212";
	const temperature = options.temperature || 0.2;
	const maxTokens = options.maxTokens || 1000;

	// Analiz şablonunu al
	const promptData = getAnalysisPrompt("xai", prompt, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.XAI_API_KEY}`,
	};

	// Yeniden deneme ile API çağrısını yap
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await xaiClient.post(
				"/chat/completions",
				{
					model,
					...promptData,
					temperature,
					max_tokens: maxTokens,
				},
				{ headers }
			);

			// Validate response
			if (!response.data?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from X.AI API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "X.AI Provider",
		}
	);
}

module.exports = { translate, analyze };
