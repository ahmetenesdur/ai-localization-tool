import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BaseProvider, type ProviderResponse, type ProviderError } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "@/types";
import promptTemplates from "@/utils/prompt-templates";
import RetryHelper from "@/utils/retry-helper";

interface DeepSeekMessage {
	role: "system" | "user";
	content: string;
}

interface DeepSeekRequest {
	model: string;
	messages: DeepSeekMessage[];
	temperature: number;
	max_tokens: number;
}

interface DeepSeekResponse {
	choices?: Array<{
		message?: {
			content?: string;
		};
		delta?: {
			content?: string;
		};
	}>;
}

/**
 * DeepSeek provider implementation
 */
export class DeepSeekProvider extends BaseProvider {
	private client: AxiosInstance;

	constructor(config: ApiConfig) {
		super("deepseek", config);

		this.client = axios.create({
			baseURL: "https://api.deepseek.com/v1",
			headers: {
				...this.commonHeaders,
				Authorization: `Bearer ${this.getApiKey()}`,
			},
			timeout: 45000, // Increased timeout for DeepSeek
			maxRedirects: 0,
			validateStatus: (status) => status < 500,
		});
	}

	getApiKey(): string | undefined {
		return process.env.DEEPSEEK_API_KEY;
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
		const promptData = promptTemplates.getPrompt(
			"deepseek",
			sourceLang,
			targetLang,
			text,
			options
		);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<DeepSeekResponse> = await this.client.post(
						this.getEndpoint(),
						{
							model: config.model || "deepseek-chat",
							...promptData,
							temperature: config.temperature || 0.3,
							max_tokens: config.max_tokens || 2000,
						}
					);

					this.validateResponse(response.data, this.name);
					const translation = this.extractTranslation(response.data, this.name);
					return this.sanitizeTranslation(translation);
				} catch (error) {
					this.handleApiError(error as ProviderError, this.name);
				}
			},
			{
				maxRetries: (options as any).retryOptions?.maxRetries || 3, // Increased retries for DeepSeek
				initialDelay: (options as any).retryOptions?.initialDelay || 2000, // Increased initial delay
				context: "DeepSeek Provider",
				logContext: {
					source: sourceLang,
					target: targetLang,
				},
			}
		);
	}

	async analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
		const config = this.getConfig({
			model: options.model || "deepseek-chat",
			temperature: options.temperature || 0.2,
			maxTokens: options.maxTokens || 1000,
		});

		const promptData = promptTemplates.getAnalysisPrompt("deepseek", prompt, options);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<DeepSeekResponse> = await this.client.post(
						this.getEndpoint(),
						{
							model: config.model,
							...promptData,
							temperature: config.temperature,
							max_tokens: config.max_tokens,
						}
					);

					this.validateResponse(response.data, this.name);
					const result = this.extractTranslation(response.data, this.name);
					return this.sanitizeTranslation(result);
				} catch (error) {
					this.handleApiError(error as ProviderError, this.name);
				}
			},
			{
				maxRetries: (options as any).maxRetries || 2,
				initialDelay: (options as any).initialDelay || 1000,
				context: "DeepSeek Provider Analysis",
			}
		);
	}

	private sanitizeTranslation(text: string): string {
		if (!text) return text;

		// Remove think tags and other AI artifacts
		let sanitized = text
			.replace(/\<think\>[\s\S]*?\<\/think\>/gi, "")
			.replace(/^[A-Za-z]+ translation:[\s\S]*?\n/gim, "")
			.replace(/^(Here's|This is|The) (the )?translation:?\s*/gim, "")
			.replace(/^Translation result:?\s*/gim, "")
			.replace(/^\s*[-•]\s*/gm, "")
			.replace(/^['"]|['"]$/g, "")
			.replace(/^\s+|\s+$/gm, "")
			.trim();

		// Remove duplicate lines
		const lines = sanitized
			.split("\n")
			.filter((line) => line.trim())
			.filter((line, index, arr) => line !== arr[index - 1]);

		return lines.join("\n");
	}
}

// Create singleton instance for backward compatibility
const deepseekProvider = new DeepSeekProvider({
	model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
	temperature: 0.3,
	maxTokens: 2000,
	contextWindow: 8000,
});

// Export both class and legacy functions
export async function translate(
	text: string,
	sourceLang: string,
	targetLang: string,
	options?: TranslationOptions
): Promise<string> {
	return deepseekProvider.translate(text, sourceLang, targetLang, options);
}

export async function analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
	return deepseekProvider.analyze(prompt, options);
}

export { deepseekProvider };
