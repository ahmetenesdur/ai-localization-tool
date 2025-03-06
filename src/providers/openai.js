const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

// Create axios instance with default config
const openaiClient = axios.create({
	baseURL: "https://api.openai.com/v1",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.openai?.model || "gpt-4o";
	const temperature = options.apiConfig?.openai?.temperature || 0.3;
	const maxTokens = options.apiConfig?.openai?.maxTokens || 2000;

	const promptData = getPrompt("openai", sourceLang, targetLang, text, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
	};

	// Çeviri işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await openaiClient.post(
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
				throw new Error("Invalid response format from OpenAI API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "OpenAI Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const model = options.model || "gpt-4o";
	const temperature = options.temperature || 0.2;
	const maxTokens = options.maxTokens || 1000;

	// Analiz şablonunu al
	const promptData = getAnalysisPrompt("openai", prompt, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
	};

	// Analiz işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await openaiClient.post(
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
				throw new Error("Invalid response format from OpenAI API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "OpenAI Provider",
		}
	);
}

module.exports = { translate, analyze };
