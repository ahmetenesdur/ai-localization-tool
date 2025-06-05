const BaseProvider = require("./base-provider");

/**
 * DashScope Provider - Extends BaseProvider for Alibaba DashScope API
 * REFACTORED: Eliminated code duplication using BaseProvider with DashScope-specific overrides
 */
class DashScopeProvider extends BaseProvider {
	constructor() {
		super({
			name: "dashscope",
			baseURL: "https://dashscope-intl.aliyuncs.com",
			apiKeyEnvVar: "DASHSCOPE_API_KEY",
			defaultModel: "qwen-plus",
			timeout: 30000,
		});

		// Create separate client for text generation API
		const axios = require("axios");
		this.generationClient = axios.create({
			baseURL: "https://dashscope.aliyuncs.com/api/v1/services/aigc",
			headers: {
				"Content-Type": "application/json",
			},
			timeout: 30000,
		});
	}

	/**
	 * DashScope translate endpoint (compatible mode)
	 */
	_getTranslateEndpoint() {
		return "/compatible-mode/v1/chat/completions";
	}

	/**
	 * DashScope analyze endpoint (different API)
	 */
	_getAnalyzeEndpoint() {
		return "/text-generation/generation";
	}

	/**
	 * DashScope analysis uses different response format
	 */
	_extractResponse(response, operation = "translate") {
		if (operation === "analyze") {
			// DashScope analysis API response format
			if (!response.data?.output?.text) {
				throw new Error("Invalid response format from DashScope API");
			}
			return response.data.output.text.trim();
		} else {
			// DashScope translate API (OpenAI-compatible)
			if (!response.data?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from DashScope API");
			}
			return response.data.choices[0].message.content.trim();
		}
	}

	/**
	 * Override analyze to use different client and endpoint
	 */
	async analyze(prompt, options = {}) {
		const config = this._getConfig(options, "analyze");
		const { getAnalysisPrompt } = require("../utils/prompt-templates");
		const promptData = getAnalysisPrompt(this.providerName, prompt, {
			...options,
			model: config.model,
			temperature: config.temperature,
			maxTokens: config.maxTokens,
		});
		const apiKey = this._getApiKey();
		const headers = this._prepareHeaders(apiKey);
		const retryConfig = this._getRetryConfig(options, "analyze");

		const RetryHelper = require("../utils/retry-helper");

		return RetryHelper.withRetry(async () => {
			// Use generation client for analysis
			const response = await this.generationClient.post(
				this._getAnalyzeEndpoint(),
				{
					...promptData,
				},
				{ headers }
			);

			return this._extractResponse(response, "analyze");
		}, retryConfig);
	}
}

// Create and export instance
const dashscopeProvider = new DashScopeProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		dashscopeProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => dashscopeProvider.analyze(prompt, options),
};
