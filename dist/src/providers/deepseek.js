"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepseekProvider = exports.DeepSeekProvider = void 0;
exports.translate = translate;
exports.analyze = analyze;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base-provider");
const prompt_templates_1 = __importDefault(require("../utils/prompt-templates"));
const retry_helper_1 = __importDefault(require("../utils/retry-helper"));
/**
 * DeepSeek provider implementation
 */
class DeepSeekProvider extends base_provider_1.BaseProvider {
    constructor(config) {
        super("deepseek", config);
        this.client = axios_1.default.create({
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
    getApiKey() {
        return process.env.DEEPSEEK_API_KEY;
    }
    getEndpoint() {
        return "/chat/completions";
    }
    async translate(text, sourceLang, targetLang, options = {}) {
        this.validateRequest(text, sourceLang, targetLang);
        const config = this.getConfig(options);
        const promptData = prompt_templates_1.default.getPrompt("deepseek", sourceLang, targetLang, text, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(this.getEndpoint(), {
                    model: config.model || "deepseek-chat",
                    ...promptData,
                    temperature: config.temperature || 0.3,
                    max_tokens: config.max_tokens || 2000,
                });
                this.validateResponse(response.data, this.name);
                const translation = this.extractTranslation(response.data, this.name);
                return this.sanitizeTranslation(translation);
            }
            catch (error) {
                this.handleApiError(error, this.name);
            }
        }, {
            maxRetries: options.retryOptions?.maxRetries || 3, // Increased retries for DeepSeek
            initialDelay: options.retryOptions?.initialDelay || 2000, // Increased initial delay
            context: "DeepSeek Provider",
            logContext: {
                source: sourceLang,
                target: targetLang,
            },
        });
    }
    async analyze(prompt, options = {}) {
        const config = this.getConfig({
            model: options.model || "deepseek-chat",
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 1000,
        });
        const promptData = prompt_templates_1.default.getAnalysisPrompt("deepseek", prompt, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(this.getEndpoint(), {
                    model: config.model,
                    ...promptData,
                    temperature: config.temperature,
                    max_tokens: config.max_tokens,
                });
                this.validateResponse(response.data, this.name);
                const result = this.extractTranslation(response.data, this.name);
                return this.sanitizeTranslation(result);
            }
            catch (error) {
                this.handleApiError(error, this.name);
            }
        }, {
            maxRetries: options.maxRetries || 2,
            initialDelay: options.initialDelay || 1000,
            context: "DeepSeek Provider Analysis",
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
exports.DeepSeekProvider = DeepSeekProvider;
// Create singleton instance for backward compatibility
const deepseekProvider = new DeepSeekProvider({
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    temperature: 0.3,
    maxTokens: 2000,
    contextWindow: 8000,
});
exports.deepseekProvider = deepseekProvider;
// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
    return deepseekProvider.translate(text, sourceLang, targetLang, options);
}
async function analyze(prompt, options = {}) {
    return deepseekProvider.analyze(prompt, options);
}
//# sourceMappingURL=deepseek.js.map