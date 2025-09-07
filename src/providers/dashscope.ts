import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BaseProvider, type ProviderResponse, type ProviderError } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "@/types";
import promptTemplates from "@/utils/prompt-templates";
import RetryHelper from "@/utils/retry-helper";

interface DashScopeMessage {
	role: "system" | "user";
	content: string;
}

interface DashScopeRequest {
	model: string;
	messages: DashScopeMessage[];
	temperature: number;
	max_tokens: number;
}

interface DashScopeAnalysisRequest {
	model: string;
	input: {
		messages: DashScopeMessage[];
	};
	parameters: {
		temperature: number;
		max_tokens: number;
	};
}

interface DashScopeResponse {
	output?: {
		text?: string;
	};
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
}

interface DashScopeAnalysisResponse {
	data?: {
		output?: {
			text?: string;
		};
	};
}

/**
 * DashScope provider implementation
 */
export class DashScopeProvider extends BaseProvider {
	private client: AxiosInstance;
	private generationClient: AxiosInstance;

	constructor(config: ApiConfig) {
		super("dashscope", config);

		this.client = axios.create({
			baseURL: "https://dashscope-intl.aliyuncs.com",
			headers: {
				...this.commonHeaders,
				Authorization: `Bearer ${this.getApiKey()}`,
			},
			timeout: 30000,
			maxRedirects: 0,
			validateStatus: (status) => status < 500,
		});

		// Generation client for analysis
		this.generationClient = axios.create({
			baseURL: "https://dashscope.aliyuncs.com/api/v1/services/aigc",
			headers: {
				...this.commonHeaders,
				Authorization: `Bearer ${this.getApiKey()}`,
			},
			timeout: 30000,
			maxRedirects: 0,
			validateStatus: (status) => status < 500,
		});
	}

	getApiKey(): string | undefined {
		return process.env.DASHSCOPE_API_KEY;
	}

	getEndpoint(): string {
		return "/compatible-mode/v1/chat/completions";
	}

	private getGenerationEndpoint(): string {
		return "/text-generation/generation";
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
			"dashscope",
			sourceLang,
			targetLang,
			text,
			options
		);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<DashScopeResponse> = await this.client.post(
						this.getEndpoint(),
						{
							model: config.model || "qwen-plus",
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
				maxRetries: (options as any).retryOptions?.maxRetries || 2,
				initialDelay: (options as any).retryOptions?.initialDelay || 1000,
				context: "DashScope Provider",
				logContext: {
					source: sourceLang,
					target: targetLang,
				},
			}
		);
	}

	async analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
		const config = this.getConfig({
			model: options.model || "qwen-plus",
			temperature: options.temperature || 0.2,
			maxTokens: options.maxTokens || 1000,
		});

		const promptData = promptTemplates.getAnalysisPrompt("dashscope", prompt, {
			...options,
			...config,
		});

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<DashScopeAnalysisResponse> =
						await this.generationClient.post(this.getGenerationEndpoint(), {
							...promptData,
						});

					if (!response.data?.data?.output?.text) {
						throw new Error("Invalid response format from DashScope API");
					}

					const result = response.data.data.output.text.trim();
					return this.sanitizeTranslation(result);
				} catch (error) {
					this.handleApiError(error as ProviderError, this.name);
				}
			},
			{
				maxRetries: (options as any).maxRetries || 2,
				initialDelay: (options as any).initialDelay || 1000,
				context: "DashScope Provider Analysis",
			}
		);
	}

	private sanitizeTranslation(text: string): string {
		if (!text) return text;

		// Remove think tags and other AI artifacts
		let sanitized = text
			.replace(/<think>[\s\S]*?<\/think>/gi, "")
			.replace(/^[A-Za-z]+ translation:[\s\S]*?\n/gim, "")
			.replace(/^(Here's|This is|The) (the )?translation:?[\s\S]*?\n/gim, "")
			.replace(/^Translation result:?[\s\S]*?\n/gim, "")
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
const dashscopeProvider = new DashScopeProvider({
	model: process.env.DASHSCOPE_MODEL || "qwen-plus",
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
	return dashscopeProvider.translate(text, sourceLang, targetLang, options);
}

export async function analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
	return dashscopeProvider.analyze(prompt, options);
}

export { dashscopeProvider };
