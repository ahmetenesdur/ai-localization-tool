"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xaiProvider = exports.XAIProvider = void 0;
exports.translate = translate;
exports.analyze = analyze;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base-provider");
const prompt_templates_1 = __importDefault(require("../utils/prompt-templates"));
const retry_helper_1 = __importDefault(require("../utils/retry-helper"));
/**
 * XAI provider implementation
 */
class XAIProvider extends base_provider_1.BaseProvider {
    constructor(config) {
        super("xai", config);
        this.client = axios_1.default.create({
            baseURL: "https://api.x.ai/v1",
            headers: {
                ...this.commonHeaders,
                Authorization: `Bearer ${this.getApiKey()}`,
            },
            timeout: 30000,
            maxRedirects: 0,
            validateStatus: (status) => status < 500,
        });
    }
    getApiKey() {
        return process.env.XAI_API_KEY;
    }
    getEndpoint() {
        return "/chat/completions";
    }
    async translate(text, sourceLang, targetLang, options = {}) {
        this.validateRequest(text, sourceLang, targetLang);
        const config = this.getConfig(options);
        const promptData = prompt_templates_1.default.getPrompt("xai", sourceLang, targetLang, text, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(this.getEndpoint(), {
                    model: config.model || "grok-2-1212",
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
            maxRetries: options.retryOptions?.maxRetries || 2,
            initialDelay: options.retryOptions?.initialDelay || 1000,
            context: "X.AI Provider",
            logContext: {
                source: sourceLang,
                target: targetLang,
            },
        });
    }
    async analyze(prompt, options = {}) {
        const config = this.getConfig({
            model: options.model || "grok-2-1212",
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 1000,
        });
        const promptData = prompt_templates_1.default.getAnalysisPrompt("xai", prompt, options);
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
            context: "X.AI Provider Analysis",
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
exports.XAIProvider = XAIProvider;
// Create singleton instance for backward compatibility
const xaiProvider = new XAIProvider({
    model: process.env.XAI_MODEL || "grok-2-1212",
    temperature: 0.3,
    maxTokens: 2000,
    contextWindow: 8000,
});
exports.xaiProvider = xaiProvider;
// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
    return xaiProvider.translate(text, sourceLang, targetLang, options);
}
async function analyze(prompt, options = {}) {
    return xaiProvider.analyze(prompt, options);
}
//# sourceMappingURL=xai.js.map