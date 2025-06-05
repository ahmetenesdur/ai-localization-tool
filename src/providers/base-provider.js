const axios = require("axios");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");
const CONSTANTS = require("../utils/constants");

/**
 * BaseProvider - Abstract base class for all translation providers
 * Eliminates code duplication and provides consistent behavior across providers
 */
class BaseProvider {
	constructor(config) {
		this.providerName = config.name;
		this.baseURL = config.baseURL;
		this.timeout = config.timeout || CONSTANTS.PROVIDERS.DEFAULT_TIMEOUT;
		this.apiKeyEnvVar = config.apiKeyEnvVar;
		this.defaultModel = config.defaultModel;
		this.defaultHeaders = config.defaultHeaders || { "Content-Type": "application/json" };

		// Create axios instance with provider-specific config
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: this.defaultHeaders,
			timeout: this.timeout,
		});
	}

	/**
	 * Extract configuration from options with provider-specific defaults
	 */
	_getConfig(options, operation = "translate") {
		const providerConfig = options.apiConfig?.[this.providerName] || {};

		return {
			model: providerConfig.model || this.defaultModel,
			temperature:
				providerConfig.temperature ||
				(operation === "analyze"
					? CONSTANTS.PROVIDERS.DEFAULT_TEMPERATURE_ANALYZE
					: CONSTANTS.PROVIDERS.DEFAULT_TEMPERATURE_TRANSLATE),
			maxTokens:
				providerConfig.maxTokens ||
				(operation === "analyze"
					? CONSTANTS.PROVIDERS.DEFAULT_MAX_TOKENS_ANALYZE
					: CONSTANTS.PROVIDERS.DEFAULT_MAX_TOKENS_TRANSLATE),
		};
	}

	/**
	 * Get API key from environment variables
	 */
	_getApiKey() {
		const apiKey = process.env[this.apiKeyEnvVar];
		if (!apiKey) {
			throw new Error(`${this.apiKeyEnvVar} environment variable not found`);
		}
		return apiKey;
	}

	/**
	 * Get retry configuration
	 */
	_getRetryConfig(options, operation = "translate", context = {}) {
		return {
			maxRetries: options.retryOptions?.maxRetries || CONSTANTS.PROVIDERS.DEFAULT_RETRY_COUNT,
			initialDelay:
				options.retryOptions?.initialDelay || CONSTANTS.PROVIDERS.DEFAULT_RETRY_DELAY,
			context: `${this.providerName.charAt(0).toUpperCase() + this.providerName.slice(1)} Provider`,
			logContext: operation === "translate" ? context : undefined,
		};
	}

	/**
	 * Prepare request headers (override in subclasses if needed)
	 */
	_prepareHeaders(apiKey) {
		return {
			Authorization: `Bearer ${apiKey}`,
		};
	}

	/**
	 * Prepare request data (override in subclasses for provider-specific formats)
	 */
	_prepareTranslateRequest(promptData, config) {
		return {
			model: config.model,
			...promptData,
			temperature: config.temperature,
			max_tokens: config.maxTokens,
		};
	}

	/**
	 * Prepare analysis request (override in subclasses for provider-specific formats)
	 */
	_prepareAnalyzeRequest(promptData, config) {
		return {
			model: config.model,
			...promptData,
			temperature: config.temperature,
			max_tokens: config.maxTokens,
		};
	}

	/**
	 * Extract response content (override in subclasses for provider-specific response formats)
	 */
	_extractResponse(response, operation = "translate") {
		// Default OpenAI-compatible response format
		if (!response.data?.choices?.[0]?.message?.content) {
			throw new Error(`Invalid response format from ${this.providerName.toUpperCase()} API`);
		}
		return response.data.choices[0].message.content.trim();
	}

	/**
	 * Get API endpoint (override in subclasses if needed)
	 */
	_getTranslateEndpoint() {
		return "/chat/completions";
	}

	/**
	 * Get analysis endpoint (override in subclasses if needed)
	 */
	_getAnalyzeEndpoint() {
		return "/chat/completions";
	}

	/**
	 * Make API request with provider-specific configuration
	 */
	async _makeRequest(endpoint, requestData, headers, options = {}) {
		const config = {
			headers,
			...options,
		};

		return await this.client.post(endpoint, requestData, config);
	}

	/**
	 * Main translation method
	 */
	async translate(text, sourceLang, targetLang, options) {
		const config = this._getConfig(options, "translate");
		const promptData = getPrompt(this.providerName, sourceLang, targetLang, text, options);
		const apiKey = this._getApiKey();
		const headers = this._prepareHeaders(apiKey);
		const requestData = this._prepareTranslateRequest(promptData, config);
		const retryConfig = this._getRetryConfig(options, "translate", {
			source: sourceLang,
			target: targetLang,
		});

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
	 * Main analysis method
	 */
	async analyze(prompt, options = {}) {
		const config = this._getConfig(options, "analyze");
		const promptData = getAnalysisPrompt(this.providerName, prompt, options);
		const apiKey = this._getApiKey();
		const headers = this._prepareHeaders(apiKey);
		const requestData = this._prepareAnalyzeRequest(promptData, config);
		const retryConfig = this._getRetryConfig(options, "analyze");

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

module.exports = BaseProvider;
