import type {
	TranslationOptions,
	TranslationResult,
	ApiConfig,
	ContextData,
	LengthControlConfig,
} from "@/types";

export interface ProviderResponse {
	data?: any;
	choices?: Array<{
		message?: { content?: string };
		text?: string;
		delta?: { content?: string };
	}>;
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
	output?: { text?: string };
	text?: string;
	content?: string;
}

export interface ProviderError extends Error {
	response?: {
		status: number;
		data?: {
			error?: { message?: string };
			message?: string;
		};
	};
	code?: string;
}

/**
 * OPTIMIZED: Abstract base class for all translation providers
 * Eliminates code duplication and provides consistent interface
 */
export abstract class BaseProvider {
	protected name: string;
	protected config: ApiConfig;
	protected defaultModel: string;
	protected defaultTemperature: number;
	protected defaultMaxTokens: number;
	protected commonHeaders: Record<string, string>;

	constructor(name: string, config: ApiConfig) {
		this.name = name;
		this.config = config;
		this.defaultModel = config.model;
		this.defaultTemperature = config.temperature || 0.3;
		this.defaultMaxTokens = config.maxTokens || 2000;

		this.commonHeaders = {
			"Content-Type": "application/json",
			"User-Agent": "ai-localization-tool/1.0",
		};
	}

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	abstract translate(
		text: string,
		sourceLang: string,
		targetLang: string,
		options?: TranslationOptions
	): Promise<string>;

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	abstract getApiKey(): string | undefined;

	/**
	 * Abstract method - must be implemented by subclasses
	 */
	abstract getEndpoint(): string;

	/**
	 * OPTIMIZED: Common request validation logic
	 */
	protected validateRequest(text: string, sourceLang: string, targetLang: string): void {
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
	protected validateResponse(response: ProviderResponse, providerName: string): boolean {
		if (!response) {
			throw new Error(`No response from ${providerName} API`);
		}

		if (
			!response.data &&
			!response.choices &&
			!response.candidates &&
			!response.output &&
			!response.text &&
			!response.content
		) {
			throw new Error(`Invalid response format from ${providerName}`);
		}

		return true;
	}

	/**
	 * OPTIMIZED: Common error handling
	 */
	protected handleApiError(error: ProviderError, providerName: string): never {
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
	protected generatePrompt(
		text: string,
		sourceLang: string,
		targetLang: string,
		options: TranslationOptions = {}
	): string {
		const context = options.detectedContext;
		let prompt = `Translate the following text from ${sourceLang} to ${targetLang}`;

		if (context?.category && context.category !== "general") {
			const categoryPrompts: Record<string, string> = {
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

		prompt += `\\n\\nText to translate: "${text}"`;
		prompt += "\\n\\nProvide only the translation without explanations or quotes.";

		return prompt;
	}

	/**
	 * OPTIMIZED: Common configuration getter with validation
	 */
	protected getConfig(options: TranslationOptions = {}): {
		model: string;
		temperature: number;
		max_tokens: number;
		apiKey: string;
		endpoint: string;
	} {
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
	protected extractTranslation(response: ProviderResponse, providerName: string): string {
		// Debug logging for DeepSeek issues
		if (providerName === "deepseek") {
			console.log(`DeepSeek response structure:`, JSON.stringify(response, null, 2));
		}

		// Try common response formats
		if (response.choices && response.choices[0]?.message?.content) {
			return response.choices[0].message.content.trim();
		}

		if (response.choices && response.choices[0]?.text) {
			return response.choices[0].text.trim();
		}

		// DeepSeek specific response format
		if (response.choices && response.choices[0]?.delta?.content) {
			return response.choices[0].delta.content.trim();
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

		// Additional DeepSeek response formats
		if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
			return response.data.choices[0].message.content.trim();
		}

		// Log the full response structure for debugging
		console.error(
			`Unable to extract translation from ${providerName} response. Response structure:`,
			{
				keys: Object.keys(response),
				choices: response.choices ? `Array(${response.choices.length})` : "undefined",
				choicesStructure:
					response.choices && response.choices[0]
						? Object.keys(response.choices[0])
						: "undefined",
				candidatesStructure:
					response.candidates && response.candidates[0]
						? Object.keys(response.candidates[0])
						: "undefined",
			}
		);

		throw new Error(
			`Unable to extract translation from ${providerName} response. ` +
				`Available keys: ${Object.keys(response).join(", ")}`
		);
	}

	/**
	 * Validate translation quality and consistency
	 */
	protected validateTranslation(original: string, translated: string): boolean {
		// Basic validation checks
		if (!translated || translated.trim().length === 0) {
			return false;
		}

		// Check for placeholder consistency
		const originalPlaceholders = original.match(/\\{\\{[^}]+\\}\\}/g) || [];
		const translatedPlaceholders = translated.match(/\\{\\{[^}]+\\}\\}/g) || [];

		return originalPlaceholders.length === translatedPlaceholders.length;
	}

	/**
	 * Get provider name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Get provider configuration
	 */
	getProviderConfig(): ApiConfig {
		return { ...this.config };
	}
}
