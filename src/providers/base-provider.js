/**
 * OPTIMIZED: Abstract base class for all translation providers
 * Eliminates code duplication and provides consistent interface
 */
class BaseProvider {
	constructor(name, config = {}) {
		this.name = name;
		this.config = config;
		this.defaultModel = config.model;
		this.defaultTemperature = config.temperature || 0.3;
		this.defaultMaxTokens = config.maxTokens || 2000;

		this.commonHeaders = {
			"Content-Type": "application/json",
			"User-Agent": "localization-tool/1.0",
		};
	}

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	async translate(text, sourceLang, targetLang, options = {}) {
		throw new Error(`translate method must be implemented by ${this.name} provider`);
	}

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	getApiKey() {
		throw new Error(`getApiKey method must be implemented by ${this.name} provider`);
	}

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	getEndpoint() {
		throw new Error(`getEndpoint method must be implemented by ${this.name} provider`);
	}

	/**
	 * OPTIMIZED: Common request validation logic
	 */
	validateRequest(text, sourceLang, targetLang) {
		if (!text || typeof text !== "string") {
			throw new Error("Text must be a non-empty string");
		}

		if (!sourceLang || !targetLang) {
			throw new Error("Source and target languages are required");
		}

		if (text.length > 10000) {
			throw new Error("Text too long for translation (max 10000 characters)");
		}
	}

	/**
	 * OPTIMIZED: Common response validation logic
	 */
	validateResponse(response, providerName) {
		if (!response) {
			throw new Error(`No response from ${providerName} API`);
		}

		if (!response.data) {
			throw new Error(`Invalid response format from ${providerName}`);
		}

		return true;
	}

	/**
	 * OPTIMIZED: Common error handling
	 */
	handleApiError(error, providerName) {
		if (error.response) {
			const status = error.response.status;
			const message =
				error.response.data?.error?.message ||
				error.response.data?.message ||
				"Unknown API error";

			if (status === 429) {
				throw new Error(`rate_limit: ${providerName} rate limit exceeded`);
			} else if (status >= 500) {
				throw new Error(`server: ${providerName} server error - ${message}`);
			} else if (status === 401 || status === 403) {
				throw new Error(`auth: ${providerName} authentication failed - ${message}`);
			} else {
				throw new Error(`api: ${providerName} API error (${status}) - ${message}`);
			}
		} else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
			throw new Error(`network: Cannot connect to ${providerName} API`);
		} else if (error.code === "ECONNABORTED") {
			throw new Error(`timeout: ${providerName} request timed out`);
		} else {
			throw new Error(`unknown: ${providerName} - ${error.message}`);
		}
	}

	/**
	 * OPTIMIZED: Generate translation prompt with context
	 */
	generatePrompt(text, sourceLang, targetLang, options = {}) {
		const context = options.detectedContext;
		let prompt = `Translate the following text from ${sourceLang} to ${targetLang}`;

		if (context?.category && context.category !== "general") {
			const categoryPrompts = {
				technical: ". Preserve technical terms and variable names exactly as they appear.",
				defi: ". Keep DeFi and cryptocurrency terms in English.",
				marketing: ". Use persuasive and engaging language appropriate for marketing.",
				legal: ". Maintain formal tone and precise legal terminology.",
				ui: ". Keep UI terms consistent and clear for user interface elements.",
			};

			prompt += categoryPrompts[context.category] || "";
		}

		if (options.lengthControl?.mode === "strict") {
			prompt += " Keep the translation length similar to the original.";
		}

		prompt += `\n\nText to translate: "${text}"`;
		prompt += "\n\nProvide only the translation without explanations or quotes.";

		return prompt;
	}

	/**
	 * OPTIMIZED: Common configuration getter with validation
	 */
	getConfig(options = {}) {
		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error(`API key not configured for ${this.name} provider`);
		}

		return {
			model: options.model || this.defaultModel,
			temperature: options.temperature ?? this.defaultTemperature,
			max_tokens: options.maxTokens || this.defaultMaxTokens,
			apiKey: apiKey,
			endpoint: this.getEndpoint(),
		};
	}

	/**
	 * OPTIMIZED: Extract translation from various response formats
	 */
	extractTranslation(response, providerName) {
		// Try common response formats
		if (response.choices && response.choices[0]?.message?.content) {
			return response.choices[0].message.content.trim();
		}

		if (response.choices && response.choices[0]?.text) {
			return response.choices[0].text.trim();
		}

		if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
			return response.candidates[0].content.parts[0].text.trim();
		}

		if (response.output && response.output.text) {
			return response.output.text.trim();
		}

		if (response.text) {
			return response.text.trim();
		}

		if (response.content) {
			return response.content.trim();
		}

		throw new Error(`Unable to extract translation from ${providerName} response`);
	}

	/**
	 * OPTIMIZED: Sanitize translation output
	 */
	sanitizeTranslation(translation) {
		if (!translation || typeof translation !== "string") {
			throw new Error("Invalid translation format");
		}

		return translation
			.replace(/^["']|["']$/g, "") // Remove surrounding quotes
			.replace(/^\s*Translation:\s*/i, "") // Remove "Translation:" prefix
			.replace(/^\s*Result:\s*/i, "") // Remove "Result:" prefix
			.trim();
	}
}

module.exports = BaseProvider;
