"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashscopeProvider = exports.DashScopeProvider = void 0;
exports.translate = translate;
exports.analyze = analyze;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base-provider");
const prompt_templates_1 = __importDefault(require("../utils/prompt-templates"));
const retry_helper_1 = __importDefault(require("../utils/retry-helper"));
/**
 * DashScope provider implementation
 */
class DashScopeProvider extends base_provider_1.BaseProvider {
    constructor(config) {
        super("dashscope", config);
        this.client = axios_1.default.create({
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
        this.generationClient = axios_1.default.create({
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
    getApiKey() {
        return process.env.DASHSCOPE_API_KEY;
    }
    getEndpoint() {
        return "/compatible-mode/v1/chat/completions";
    }
    getGenerationEndpoint() {
        return "/text-generation/generation";
    }
    async translate(text, sourceLang, targetLang, options = {}) {
        this.validateRequest(text, sourceLang, targetLang);
        const config = this.getConfig(options);
        const promptData = prompt_templates_1.default.getPrompt("dashscope", sourceLang, targetLang, text, options);
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.client.post(this.getEndpoint(), {
                    model: config.model || "qwen-plus",
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
            context: "DashScope Provider",
            logContext: {
                source: sourceLang,
                target: targetLang,
            },
        });
    }
    async analyze(prompt, options = {}) {
        const config = this.getConfig({
            model: options.model || "qwen-plus",
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 1000,
        });
        const promptData = prompt_templates_1.default.getAnalysisPrompt("dashscope", prompt, {
            ...options,
            ...config,
        });
        return retry_helper_1.default.withRetry(async () => {
            try {
                const response = await this.generationClient.post(this.getGenerationEndpoint(), {
                    ...promptData,
                });
                if (!response.data?.data?.output?.text) {
                    throw new Error("Invalid response format from DashScope API");
                }
                const result = response.data.data.output.text.trim();
                return this.sanitizeTranslation(result);
            }
            catch (error) {
                this.handleApiError(error, this.name);
            }
        }, {
            maxRetries: options.maxRetries || 2,
            initialDelay: options.initialDelay || 1000,
            context: "DashScope Provider Analysis",
        });
    }
    sanitizeTranslation(text) {
        if (!text)
            return text;
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
exports.DashScopeProvider = DashScopeProvider;
// Create singleton instance for backward compatibility
const dashscopeProvider = new DashScopeProvider({
    model: process.env.DASHSCOPE_MODEL || "qwen-plus",
    temperature: 0.3,
    maxTokens: 2000,
    contextWindow: 8000,
});
exports.dashscopeProvider = dashscopeProvider;
// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
    return dashscopeProvider.translate(text, sourceLang, targetLang, options);
}
async function analyze(prompt, options = {}) {
    return dashscopeProvider.analyze(prompt, options);
}
//# sourceMappingURL=dashscope.js.map