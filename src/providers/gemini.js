const BaseProvider = require("./base-provider");

/**
 * Gemini Provider - Extends BaseProvider for Google Gemini API
 * REFACTORED: Eliminated code duplication using BaseProvider with Gemini-specific overrides
 */
class GeminiProvider extends BaseProvider {
	constructor() {
		super({
			name: "gemini",
			baseURL: "https://generativelanguage.googleapis.com/v1beta",
			apiKeyEnvVar: "GEMINI_API_KEY",
			defaultModel: "gemini-1.5-flash",
			timeout: 30000,
		});
	}

	/**
	 * Gemini doesn't use Authorization header, instead uses API key as query param
	 */
	_prepareHeaders(apiKey) {
		// Gemini doesn't need Authorization header
		return {};
	}

	/**
	 * Gemini has a different request format
	 */
	_prepareTranslateRequest(promptData, config) {
		return {
			...promptData,
			generationConfig: {
				temperature: config.temperature,
				maxOutputTokens: config.maxTokens,
			},
		};
	}

	/**
	 * Gemini analysis request format
	 */
	_prepareAnalyzeRequest(promptData, config) {
		return {
			...promptData,
			generationConfig: {
				temperature: config.temperature,
				maxOutputTokens: config.maxTokens,
			},
		};
	}

	/**
	 * Gemini has different endpoints for each model
	 */
	_getTranslateEndpoint() {
		const config = this._getConfig({ apiConfig: {} }, "translate");
		return `/models/${config.model}:generateContent`;
	}

	/**
	 * Gemini analysis endpoint
	 */
	_getAnalyzeEndpoint() {
		const config = this._getConfig({ apiConfig: {} }, "analyze");
		return `/models/${config.model}:generateContent`;
	}

	/**
	 * Gemini-specific response extraction
	 */
	_extractResponse(response, operation = "translate") {
		// Validate Gemini response format
		if (!response.data?.candidates || response.data.candidates.length === 0) {
			throw new Error(`Failed to get ${operation} result from Gemini API`);
		}

		if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
			throw new Error("Invalid response format from Gemini API");
		}

		return response.data.candidates[0].content.parts[0].text.trim();
	}

	/**
	 * Override make request to include API key as query param
	 */
	async _makeRequest(endpoint, requestData, headers, options = {}) {
		const apiKey = this._getApiKey();
		const config = {
			headers,
			params: {
				key: apiKey,
			},
			...options,
		};

		return await this.client.post(endpoint, requestData, config);
	}

	/**
	 * Override translate to pass the correct endpoint
	 */
	async translate(text, sourceLang, targetLang, options) {
		const config = this._getConfig(options, "translate");
		const promptData = getPrompt(this.providerName, sourceLang, targetLang, text, options);
		const headers = this._prepareHeaders();
		const requestData = this._prepareTranslateRequest(promptData, config);
		const retryConfig = this._getRetryConfig(options, "translate", {
			source: sourceLang,
			target: targetLang,
		});

		// Import required function
		const RetryHelper = require("../utils/retry-helper");

		return RetryHelper.withRetry(async () => {
			const response = await this._makeRequest(
				this._getTranslateEndpoint(),
				requestData,
				headers
			);

			return this._extractResponse(response, "translate");
		}, retryConfig);
	}

	/**
	 * Override analyze to pass the correct endpoint
	 */
	async analyze(prompt, options = {}) {
		const config = this._getConfig(options, "analyze");
		const promptData = getAnalysisPrompt(this.providerName, prompt, options);
		const headers = this._prepareHeaders();
		const requestData = this._prepareAnalyzeRequest(promptData, config);
		const retryConfig = this._getRetryConfig(options, "analyze");

		// Import required function
		const RetryHelper = require("../utils/retry-helper");

		return RetryHelper.withRetry(async () => {
			const response = await this._makeRequest(
				this._getAnalyzeEndpoint(),
				requestData,
				headers
			);

			return this._extractResponse(response, "analyze");
		}, retryConfig);
	}
}

// Create and export instance
const geminiProvider = new GeminiProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		geminiProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => geminiProvider.analyze(prompt, options),
};
