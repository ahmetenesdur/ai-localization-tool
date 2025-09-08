"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
const rate_limiter_1 = __importDefault(require("../utils/rate-limiter"));
class ProviderFactory {
    /**
     * Get provider with intelligent fallback based on configuration
     * FIXED: Now respects config.fallbackOrder for proper provider chaining
     */
    static getProvider(providerName, useFallback = true, config = null) {
        // Dynamic imports for providers - they will be migrated later
        const providers = {
            dashscope: require("../providers/dashscope"),
            xai: require("../providers/xai"),
            openai: require("../providers/openai"),
            deepseek: require("../providers/deepseek"),
            gemini: require("../providers/gemini"),
        };
        // Ensure the provider name is properly normalized
        const normalizedProviderName = (providerName || "").toLowerCase();
        // Check if a specific provider was requested
        if (!useFallback) {
            const selected = providers[normalizedProviderName];
            if (!selected) {
                throw new Error(`Provider ${providerName} not found or not configured`);
            }
            // Verify the provider has required API key
            if (!this.isProviderConfigured(normalizedProviderName)) {
                throw new Error(`Provider ${providerName} is not configured. Missing API key.`);
            }
            // Wrap the provider's functions with rate limiting
            const wrappedProvider = {};
            if (selected.translate) {
                wrappedProvider.translate = (text, sourceLang, targetLang, options) => {
                    // This assumes a simple priority calculation. This could be enhanced.
                    const priority = text.length < 100 ? 1 : 0;
                    return rate_limiter_1.default.enqueue(normalizedProviderName, () => selected.translate(text, sourceLang, targetLang, options), priority);
                };
            }
            if (selected.analyze) {
                wrappedProvider.analyze = (prompt, options) => {
                    return rate_limiter_1.default.enqueue(normalizedProviderName, () => selected.analyze(prompt, options));
                };
            }
            return wrappedProvider;
        }
        // For fallback mode, create array with selected provider first,
        // then all remaining providers, but only include providers with valid API keys
        const allProviders = [];
        const availableProviderNames = this.getAvailableProviders();
        // First add the selected provider if available and configured
        if (normalizedProviderName &&
            providers[normalizedProviderName] &&
            availableProviderNames.includes(normalizedProviderName)) {
            allProviders.push({
                name: normalizedProviderName,
                implementation: providers[normalizedProviderName],
            });
        }
        else if (normalizedProviderName) {
            console.warn(`Provider '${providerName}' not found or not configured, using default provider chain`);
        }
        // FIXED: Use config.fallbackOrder if available, otherwise use availableProviderNames
        let fallbackOrder = availableProviderNames;
        if (config?.fallbackOrder && Array.isArray(config.fallbackOrder)) {
            // Filter fallbackOrder to only include available providers
            fallbackOrder = config.fallbackOrder
                .filter((name) => availableProviderNames.includes(name.toLowerCase()))
                .map((name) => name.toLowerCase());
            // Add any remaining available providers not in fallbackOrder
            const remainingProviders = availableProviderNames.filter((name) => !fallbackOrder.includes(name));
            fallbackOrder = [...fallbackOrder, ...remainingProviders];
        }
        // Then add providers according to fallback order
        for (const name of fallbackOrder) {
            // Skip the already added primary provider
            if (!allProviders.some((p) => p.name === name) && providers[name]) {
                allProviders.push({ name, implementation: providers[name] });
            }
        }
        if (allProviders.length === 0) {
            throw new Error("No valid providers found for fallback chain. Please check your API keys.");
        }
        // SECURITY FIX: Log the provider chain safely if in debug mode
        if (process.env.DEBUG) {
            // Sanitize provider names to prevent information leakage
            const safeProviderNames = allProviders.map((p) => p.name || "UnknownProvider");
            console.log(`Provider fallback chain: ${safeProviderNames.join(" → ")}`);
        }
        // Create fallback provider with ordered list of providers
        // This will be typed properly when FallbackProvider is migrated
        const { FallbackProvider } = require("./fallback-provider");
        return new FallbackProvider(allProviders);
    }
    static getAvailableProviders() {
        const providers = {
            dashscope: process.env.DASHSCOPE_API_KEY,
            xai: process.env.XAI_API_KEY,
            openai: process.env.OPENAI_API_KEY,
            deepseek: process.env.DEEPSEEK_API_KEY,
            gemini: process.env.GEMINI_API_KEY,
        };
        return Object.entries(providers)
            .filter(([_, key]) => !!key)
            .map(([name]) => name);
    }
    static validateProviders() {
        const available = this.getAvailableProviders();
        if (available.length === 0) {
            throw new Error("No API providers configured. Please set at least one API key.");
        }
        return available;
    }
    // Helper to check if a provider is properly configured
    static isProviderConfigured(providerName) {
        const envVarMap = {
            dashscope: "DASHSCOPE_API_KEY",
            xai: "XAI_API_KEY",
            openai: "OPENAI_API_KEY",
            deepseek: "DEEPSEEK_API_KEY",
            gemini: "GEMINI_API_KEY",
        };
        const envKey = envVarMap[providerName.toLowerCase()];
        if (!envKey)
            return false;
        const envValue = process.env[envKey];
        return Boolean(envValue);
    }
}
exports.ProviderFactory = ProviderFactory;
exports.default = ProviderFactory;
//# sourceMappingURL=provider-factory.js.map