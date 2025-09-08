"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiProvider = exports.OpenAIProvider = void 0;
exports.translate = translate;
exports.analyze = analyze;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base-provider");
/**
 * REFACTORED: OpenAI provider now extends BaseProvider for consistency
 */
class OpenAIProvider extends base_provider_1.BaseProvider {
    constructor(config) {
        super("openai", config);
        this.client = axios_1.default.create({
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
    getApiKey() {
        return process.env.OPENAI_API_KEY;
    }
    getEndpoint() {
        return "/chat/completions";
    }
    async translate(text, sourceLang, targetLang, options = {}) {
        this.validateRequest(text, sourceLang, targetLang);
        const config = this.getConfig(options);
        const prompt = this.generatePrompt(text, sourceLang, targetLang, options);
        try {
            const requestData = {
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a professional translator. Provide accurate and natural translations.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: config.temperature,
                max_tokens: config.max_tokens,
            };
            const response = await this.client.post(this.getEndpoint(), requestData);
            this.validateResponse(response.data, this.name);
            const translation = this.extractTranslation(response.data, this.name);
            return this.sanitizeTranslation(translation);
        }
        catch (error) {
            this.handleApiError(error, this.name);
        }
    }
    async analyze(prompt, options = {}) {
        const config = this.getConfig({
            model: options.model || "gpt-4o",
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 1000,
        });
        try {
            const requestData = {
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that analyzes text content and provides structured responses.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: config.temperature,
                max_tokens: config.max_tokens,
            };
            const response = await this.client.post(this.getEndpoint(), requestData);
            this.validateResponse(response.data, this.name);
            const result = this.extractTranslation(response.data, this.name);
            return this.sanitizeTranslation(result);
        }
        catch (error) {
            this.handleApiError(error, this.name);
        }
    }
    sanitizeTranslation(text) {
        // Remove any quotes that might wrap the translation
        return text.replace(/^["']|["']$/g, "").trim();
    }
}
exports.OpenAIProvider = OpenAIProvider;
// Create singleton instance for backward compatibility
const openaiProvider = new OpenAIProvider({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 2000,
    contextWindow: 16000,
});
exports.openaiProvider = openaiProvider;
// Export both class and legacy functions
async function translate(text, sourceLang, targetLang, options) {
    return openaiProvider.translate(text, sourceLang, targetLang, options);
}
async function analyze(prompt, options = {}) {
    return openaiProvider.analyze(prompt, options);
}
//# sourceMappingURL=openai.js.map