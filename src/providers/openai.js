const axios = require("axios");
const BaseProvider = require("./base-provider");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

/**
 * REFACTORED: OpenAI provider now extends BaseProvider for consistency
 */
class OpenAIProvider extends BaseProvider {
	constructor(config = {}) {
		super("openai", config);

		this.client = axios.create({
			baseURL: "https://api.openai.com/v1",
			headers: {
				...this.commonHeaders,
				Authorization: `Bearer ${this.getApiKey()}`,
			},
			timeout: 30000,
			maxRedirects: 0,
			validateStatus: (status) => status < 500, // Don't throw on 4xx errors
		});
	}

	getApiKey() {
		return process.env.OPENAI_API_KEY;
	}

	getEndpoint() {
		return "/chat/completions";
	}

	async translate(text, sourceLang, targetLang, options = {}) {
		this.validateRequest(text, sourceLang, targetLang);

		const config = this.getConfig(options.apiConfig?.openai);
		const promptData = getPrompt("openai", sourceLang, targetLang, text, options);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response = await this.client.post(this.getEndpoint(), {
						model: config.model,
						...promptData,
						temperature: config.temperature,
						max_tokens: config.max_tokens,
					});

					this.validateResponse(response, this.name);
					const translation = this.extractTranslation(response.data, this.name);
					return this.sanitizeTranslation(translation);
				} catch (error) {
					this.handleApiError(error, this.name);
				}
			},
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
}

// Create singleton instance for backward compatibility
const openaiProvider = new OpenAIProvider();

// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
	return openaiProvider.translate(text, sourceLang, targetLang, options);
}

async function analyze(prompt, options = {}) {
	return openaiProvider.analyze(prompt, options);
}

// Add analyze method to the class
OpenAIProvider.prototype.analyze = async function (prompt, options = {}) {
	const config = this.getConfig({
		model: options.model || "gpt-4o",
		temperature: options.temperature || 0.2,
		maxTokens: options.maxTokens || 1000,
	});

	const promptData = getAnalysisPrompt("openai", prompt, options);

	return RetryHelper.withRetry(
		async () => {
			try {
				const response = await this.client.post(this.getEndpoint(), {
					model: config.model,
					...promptData,
					temperature: config.temperature,
					max_tokens: config.max_tokens,
				});

				this.validateResponse(response, this.name);
				const result = this.extractTranslation(response.data, this.name);
				return this.sanitizeTranslation(result);
			} catch (error) {
				this.handleApiError(error, this.name);
			}
		},
		{
			maxRetries: options.maxRetries || 2,
			initialDelay: options.initialDelay || 1000,
			context: "OpenAI Provider Analysis",
		}
	);
};

module.exports = { translate, analyze, OpenAIProvider };
