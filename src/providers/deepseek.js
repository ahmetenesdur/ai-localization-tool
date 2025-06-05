const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

// Create axios instance with default config
const deepseekClient = axios.create({
	baseURL: "https://api.deepseek.com/v1",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.deepseek?.model || "deepseek-chat";
	const temperature = options.apiConfig?.deepseek?.temperature || 0.3;
	const maxTokens = options.apiConfig?.deepseek?.maxTokens || 2000;

	const promptData = getPrompt("deepseek", sourceLang, targetLang, text, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
	};

	// Çeviri işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await deepseekClient.post(
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
				throw new Error("Invalid response format from DeepSeek API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "DeepSeek Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const model = options.model || "deepseek-chat";
	const temperature = options.temperature || 0.2;
	const maxTokens = options.maxTokens || 1000;

	// Analiz şablonunu al
	const promptData = getAnalysisPrompt("deepseek", prompt, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
	};

	// Analiz işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await deepseekClient.post(
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
				throw new Error("Invalid response format from DeepSeek API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "DeepSeek Provider",
		}
	);
}

module.exports = { translate, analyze };
