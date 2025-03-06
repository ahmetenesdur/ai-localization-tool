const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

async function translate(text, sourceLang, targetLang, options) {
	const endpoint =
		process.env.AZURE_DEEPSEEK_ENDPOINT ||
		"https://DeepSeek-R1-fbbcn.eastus2.models.ai.azure.com";
	const apiKey = process.env.AZURE_DEEPSEEK_API_KEY;
	const model = options.apiConfig?.azureDeepseek?.model || "DeepSeek-R1";
	const temperature = options.apiConfig?.azureDeepseek?.temperature || 0.3;
	const maxTokens = options.apiConfig?.azureDeepseek?.maxTokens || 2048;

	if (!apiKey) {
		throw new Error("Azure DeepSeek API key not found");
	}

	// Create Azure client
	const client = new ModelClient(endpoint, new AzureKeyCredential(apiKey));
	const promptData = getPrompt("azuredeepseek", sourceLang, targetLang, text, options);

	// Çeviri işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			// Prepare request
			const messages = promptData.messages || [];

			// Make API request
			const result = await client.path("/inference").post({
				contentType: "application/json",
				body: {
					model,
					messages,
					temperature,
					max_tokens: maxTokens,
				},
			});

			// Check for errors in the response
			if (result.status !== "200") {
				throw new Error(
					`Azure DeepSeek API returned status ${result.status}: ${
						result.body?.error?.message || "Unknown error"
					}`
				);
			}

			// Extract and return the translation
			if (!result.body?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from Azure DeepSeek API");
			}

			return result.body.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.retryOptions?.maxRetries || 2,
			initialDelay: options.retryOptions?.initialDelay || 1000,
			context: "Azure DeepSeek Provider",
			logContext: {
				source: sourceLang,
				target: targetLang,
			},
		}
	);
}

async function analyze(prompt, options = {}) {
	const endpoint =
		process.env.AZURE_DEEPSEEK_ENDPOINT ||
		"https://DeepSeek-R1-fbbcn.eastus2.models.ai.azure.com";
	const apiKey = process.env.AZURE_DEEPSEEK_API_KEY;
	const model = options.model || "DeepSeek-R1";
	const temperature = options.temperature || 0.2;
	const maxTokens = options.maxTokens || 1000;

	if (!apiKey) {
		throw new Error("Azure DeepSeek API key not found");
	}

	// Create Azure client
	const client = new ModelClient(endpoint, new AzureKeyCredential(apiKey));

	// Analiz şablonunu al
	const promptTemplate = getAnalysisPrompt("azuredeepseek", prompt, options);

	// Analiz işlemini RetryHelper ile gerçekleştir
	return RetryHelper.withRetry(
		// API çağrısı işlemi
		async () => {
			// Prepare request
			const messages = promptTemplate.messages || [];

			// Make API request
			const result = await client.path("/inference").post({
				contentType: "application/json",
				body: {
					model,
					messages,
					temperature,
					max_tokens: maxTokens,
				},
			});

			// Check for errors in the response
			if (result.status !== "200") {
				throw new Error(
					`Azure DeepSeek API returned status ${result.status}: ${
						result.body?.error?.message || "Unknown error"
					}`
				);
			}

			// Extract and return the analysis
			if (!result.body?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from Azure DeepSeek API");
			}

			return result.body.choices[0].message.content.trim();
		},
		// Yapılandırma seçenekleri
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "Azure DeepSeek Provider",
		}
	);
}

module.exports = { translate, analyze };
