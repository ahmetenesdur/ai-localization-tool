import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BaseProvider, type ProviderResponse, type ProviderError } from "./base-provider";
import type { TranslationOptions, ApiConfig } from "@/types";
import promptTemplates from "@/utils/prompt-templates";
import RetryHelper from "@/utils/retry-helper";

interface GeminiContentPart {
	text?: string;
}

interface GeminiContent {
	parts: GeminiContentPart[];
}

interface GeminiCandidate {
	content?: GeminiContent;
}

interface GeminiRequest {
	contents: Array<{
		parts: Array<{
			text: string;
		}>;
	}>;
	generationConfig: {
		temperature: number;
		maxOutputTokens: number;
	};
}

interface GeminiResponse {
	candidates?: GeminiCandidate[];
}

/**
 * Gemini provider implementation
 */
export class GeminiProvider extends BaseProvider {
	private client: AxiosInstance;

	constructor(config: ApiConfig) {
		super("gemini", config);

		this.client = axios.create({
			baseURL: "https://generativelanguage.googleapis.com/v1beta",
			headers: {
				...this.commonHeaders,
			},
			timeout: 30000,
			maxRedirects: 0,
			validateStatus: (status) => status < 500,
		});
	}

	getApiKey(): string | undefined {
		return process.env.GEMINI_API_KEY;
	}

	getEndpoint(): string {
		return "/models/gemini-1.5-flash:generateContent";
	}

	async translate(
		text: string,
		sourceLang: string,
		targetLang: string,
		options: TranslationOptions = {}
	): Promise<string> {
		this.validateRequest(text, sourceLang, targetLang);

		const config = this.getConfig(options);
		const model = config.model || "gemini-1.5-flash";
		const apiKey = this.getApiKey();

		if (!apiKey) {
			throw new Error("GEMINI_API_KEY environment variable not found");
		}

		const promptData = promptTemplates.getPrompt(
			"gemini",
			sourceLang,
			targetLang,
			text,
			options
		);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<GeminiResponse> = await this.client.post(
						`/models/${model}:generateContent`,
						{
							...promptData,
							generationConfig: {
								temperature: config.temperature || 0.3,
								maxOutputTokens: config.max_tokens || 2048,
							},
						},
						{
							params: { key: apiKey },
						}
					);

					if (!response.data?.candidates || response.data.candidates.length === 0) {
						throw new Error("Failed to get translation candidate from Gemini API");
					}

					if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
						throw new Error("Invalid response format from Gemini API");
					}

					const translation = response.data.candidates[0].content.parts[0].text.trim();
					return this.sanitizeTranslation(translation);
				} catch (error) {
					this.handleApiError(error as ProviderError, this.name);
				}
			},
			{
				maxRetries: (options as any).retryOptions?.maxRetries || 2,
				initialDelay: (options as any).retryOptions?.initialDelay || 1000,
				context: "Gemini Provider",
				logContext: {
					source: sourceLang,
					target: targetLang,
				},
			}
		);
	}

	async analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
		const config = this.getConfig({
			model: options.model || "gemini-1.5-flash",
			temperature: options.temperature || 0.2,
			maxTokens: options.maxTokens || 1000,
		});

		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error("GEMINI_API_KEY environment variable not found");
		}

		const promptData = promptTemplates.getAnalysisPrompt("gemini", prompt, options);

		return RetryHelper.withRetry(
			async () => {
				try {
					const response: AxiosResponse<GeminiResponse> = await this.client.post(
						`/models/${config.model}:generateContent`,
						{
							...promptData,
							generationConfig: {
								temperature: config.temperature,
								maxOutputTokens: config.max_tokens,
							},
						},
						{
							params: { key: apiKey },
						}
					);

					if (!response.data?.candidates || response.data.candidates.length === 0) {
						throw new Error("Failed to get analysis result from Gemini API");
					}

					if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
						throw new Error("Invalid response format from Gemini API");
					}

					const result = response.data.candidates[0].content.parts[0].text.trim();
					return this.sanitizeTranslation(result);
				} catch (error) {
					this.handleApiError(error as ProviderError, this.name);
				}
			},
			{
				maxRetries: (options as any).maxRetries || 2,
				initialDelay: (options as any).initialDelay || 1000,
				context: "Gemini Provider Analysis",
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
const geminiProvider = new GeminiProvider({
	model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
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
	return geminiProvider.translate(text, sourceLang, targetLang, options);
}

export async function analyze(prompt: string, options: Partial<ApiConfig> = {}): Promise<string> {
	return geminiProvider.analyze(prompt, options);
}

export { geminiProvider };
