const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

// Create axios instance with default config
const dashscopeClient = axios.create({
	baseURL: "https://dashscope-intl.aliyuncs.com",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

// Create another axios instance for text generation API
const dashscopeGenerationClient = axios.create({
	baseURL: "https://dashscope.aliyuncs.com/api/v1/services/aigc",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 30000, // 30 second timeout
});

async function translate(text, sourceLang, targetLang, options) {
	const model = options.apiConfig?.dashscope?.model || "qwen-plus";
	const temperature = options.apiConfig?.dashscope?.temperature || 0.3;
	const maxTokens = options.apiConfig?.dashscope?.maxTokens || 2000;

	const promptData = getPrompt("dashscope", sourceLang, targetLang, text, options);

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
	};

	// Çeviri işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await dashscopeClient.post(
				"/compatible-mode/v1/chat/completions",
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
				throw new Error("Invalid response format from DashScope API");
			}

			return response.data.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "DashScope Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const model = options.model || "qwen-plus";
	const temperature = options.temperature || 0.2;
	const maxTokens = options.maxTokens || 1000;

	// Analiz şablonunu al
	const promptData = getAnalysisPrompt("dashscope", prompt, {
		...options,
		model,
		temperature,
		maxTokens,
	});

	// Add API key to headers
	const headers = {
		Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
	};

	// Analiz işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			const response = await dashscopeGenerationClient.post(
				"/text-generation/generation",
				{
					...promptData,
				},
				{ headers }
			);

			// Validate response
			if (!response.data?.output?.text) {
				throw new Error("Invalid response format from DashScope API");
			}

			return response.data.output.text.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "DashScope Provider",
		}
	);
}

module.exports = { translate, analyze };
