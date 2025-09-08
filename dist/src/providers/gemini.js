"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiProvider = exports.GeminiProvider = void 0;
exports.translate = translate;
exports.analyze = analyze;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base-provider");
const prompt_templates_1 = __importDefault(require("../utils/prompt-templates"));
const retry_helper_1 = __importDefault(require("../utils/retry-helper"));
/**
 * Gemini provider implementation
 */
class GeminiProvider extends base_provider_1.BaseProvider {
    constructor(config) {
        super("gemini", config);
        this.client = axios_1.default.create({
            baseURL: "https://generativelanguage.googleapis.com/v1beta",
            headers: {
                ...this.commonHeaders,
            },
            timeout: 30000,
            maxRedirects: 0,
            validateStatus: (status) => status < 500,
        });
    }
    getApiKey() {
        return process.env.GEMINI_API_KEY;
    }
    getEndpoint() {
        return "/models/gemini-1.5-flash:generateContent";
    }
    async translate(text, sourceLang, targetLang, options = {}) {
        this.validateRequest(text, sourceLang, targetLang);
        const config = this.getConfig(options);
        const model = config.model || "gemini-1.5-flash";
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable not found");
        }
        const promptData = prompt_templates_1.default.getPrompt("gemini", sourceLang, targetLang, text, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(`/models/${model}:generateContent`, {
                    ...promptData,
                    generationConfig: {
                        temperature: config.temperature || 0.3,
                        maxOutputTokens: config.max_tokens || 2048,
                    },
                }, {
                    params: { key: apiKey },
                });
                if (!response.data?.candidates || response.data.candidates.length === 0) {
                    throw new Error("Failed to get translation candidate from Gemini API");
                }
                if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Invalid response format from Gemini API");
                }
                const translation = response.data.candidates[0].content.parts[0].text.trim();
                return this.sanitizeTranslation(translation);
            }
            catch (error) {
                this.handleApiError(error, this.name);
            }
        }, {
            maxRetries: options.retryOptions?.maxRetries || 2,
            initialDelay: options.retryOptions?.initialDelay || 1000,
            context: "Gemini Provider",
            logContext: {
                source: sourceLang,
                target: targetLang,
            },
        });
    }
    async analyze(prompt, options = {}) {
        const config = this.getConfig({
            model: options.model || "gemini-1.5-flash",
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 1000,
        });
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable not found");
        }
        const promptData = prompt_templates_1.default.getAnalysisPrompt("gemini", prompt, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(`/models/${config.model}:generateContent`, {
                    ...promptData,
                    generationConfig: {
                        temperature: config.temperature,
                        maxOutputTokens: config.max_tokens,
                    },
                }, {
                    params: { key: apiKey },
                });
                if (!response.data?.candidates || response.data.candidates.length === 0) {
                    throw new Error("Failed to get analysis result from Gemini API");
                }
                if (!response.data.candidates[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Invalid response format from Gemini API");
                }
                const result = response.data.candidates[0].content.parts[0].text.trim();
                return this.sanitizeTranslation(result);
            }
            catch (error) {
                this.handleApiError(error, this.name);
            }
        }, {
            maxRetries: options.maxRetries || 2,
            initialDelay: options.initialDelay || 1000,
            context: "Gemini Provider Analysis",
        });
    }
    sanitizeTranslation(text) {
        if (!text)
            return text;
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
exports.GeminiProvider = GeminiProvider;
// Create singleton instance for backward compatibility
const geminiProvider = new GeminiProvider({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    temperature: 0.3,
    maxTokens: 2000,
    contextWindow: 16000,
});
exports.geminiProvider = geminiProvider;
// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
    return geminiProvider.translate(text, sourceLang, targetLang, options);
}
async function analyze(prompt, options = {}) {
    return geminiProvider.analyze(prompt, options);
}
//# sourceMappingURL=gemini.js.map