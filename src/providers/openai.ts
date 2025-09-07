import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BaseProvider, type ProviderResponse, type ProviderError } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "@/types";

interface OpenAIMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenAIRequest {
	model: string;
	messages: OpenAIMessage[];
	temperature: number;
	max_tokens: number;
}

interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * REFACTORED: OpenAI provider now extends BaseProvider for consistency
 */
export class OpenAIProvider extends BaseProvider {
	private client: AxiosInstance;

	constructor(config: ApiConfig) {
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

	getApiKey(): string | undefined {
		return process.env.OPENAI_API_KEY;
	}

	getEndpoint(): string {
		return "/chat/completions";
	}

	async translate(
		text: string,
		sourceLang: string,
		targetLang: string,
		options: TranslationOptions = {}
	): Promise<string> {
		this.validateRequest(text, sourceLang, targetLang);

		const config = this.getConfig(options);
		const prompt = this.generatePrompt(text, sourceLang, targetLang, options);

		try {
			const requestData: OpenAIRequest = {
				model: config.model,
				messages: [
					{
						role: "system",
						content:
							"You are a professional translator. Provide accurate and natural translations.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: config.temperature,
				max_tokens: config.max_tokens,
			};

			const response: AxiosResponse<OpenAIResponse> = await this.client.post(
				this.getEndpoint(),
				requestData
			);

			this.validateResponse(response.data, this.name);
			const translation = this.extractTranslation(response.data, this.name);
			return this.sanitizeTranslation(translation);
		} catch (error) {
			this.handleApiError(error as ProviderError, this.name);
		}
	}

	async analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
		const config = this.getConfig({
			model: options.model || "gpt-4o",
			temperature: options.temperature || 0.2,
			maxTokens: options.maxTokens || 1000,
		});

		try {
			const requestData: OpenAIRequest = {
				model: config.model,
				messages: [
					{
						role: "system",
						content:
							"You are an AI assistant that analyzes text content and provides structured responses.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: config.temperature,
				max_tokens: config.max_tokens,
			};

			const response: AxiosResponse<OpenAIResponse> = await this.client.post(
				this.getEndpoint(),
				requestData
			);

			this.validateResponse(response.data, this.name);
			const result = this.extractTranslation(response.data, this.name);
			return this.sanitizeTranslation(result);
		} catch (error) {
			this.handleApiError(error as ProviderError, this.name);
		}
	}

	private sanitizeTranslation(text: string): string {
		// Remove any quotes that might wrap the translation
		return text.replace(/^["']|["']$/g, "").trim();
	}
}

// Create singleton instance for backward compatibility
const openaiProvider = new OpenAIProvider({
	model: process.env.OPENAI_MODEL || "gpt-4o-mini",
	temperature: 0.3,
	maxTokens: 2000,
	contextWindow: 16000,
});

// Export both class and legacy functions
export async function translate(
	text: string,
	sourceLang: string,
	targetLang: string,
	options?: TranslationOptions
): Promise<string> {
	return openaiProvider.translate(text, sourceLang, targetLang, options);
}

export async function analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
	return openaiProvider.analyze(prompt, options);
}

export { openaiProvider };
