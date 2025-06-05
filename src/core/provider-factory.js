const deepseekProvider = require("../providers/deepseek");
const geminiProvider = require("../providers/gemini");
const azureDeepseekProvider = require("../providers/azure-deepseek");
const openaiProvider = require("../providers/openai");
const dashscopeProvider = require("../providers/dashscope");
const xaiProvider = require("../providers/xai");
const FallbackProvider = require("./fallback-provider");

class ProviderFactory {
	/**
	 * Get provider with intelligent fallback based on configuration
	 * FIXED: Now respects config.fallbackOrder for proper provider chaining
	 */
	static getProvider(providerName, useFallback = true, config = null) {
		const providers = {
			dashscope: dashscopeProvider,
			xai: xaiProvider,
			openai: openaiProvider,
			azuredeepseek: azureDeepseekProvider,
			deepseek: deepseekProvider,
			gemini: geminiProvider,
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

			return selected;
		}

		// For fallback mode, create array with selected provider first,
		// then all remaining providers, but only include providers with valid API keys
		const allProviders = [];
		const availableProviderNames = this.getAvailableProviders();

		// First add the selected provider if available and configured
		if (
			normalizedProviderName &&
			providers[normalizedProviderName] &&
			availableProviderNames.includes(normalizedProviderName)
		) {
			allProviders.push(providers[normalizedProviderName]);
		} else if (normalizedProviderName) {
			console.warn(
				`Provider '${providerName}' not found or not configured, using default provider chain`
			);
		}

		// FIXED: Use config.fallbackOrder if available, otherwise use availableProviderNames
		let fallbackOrder = availableProviderNames;
		if (config?.fallbackOrder && Array.isArray(config.fallbackOrder)) {
			// Filter fallbackOrder to only include available providers
			fallbackOrder = config.fallbackOrder
				.filter((name) => availableProviderNames.includes(name.toLowerCase()))
				.map((name) => name.toLowerCase());

			// Add any remaining available providers not in fallbackOrder
			const remainingProviders = availableProviderNames.filter(
				(name) => !fallbackOrder.includes(name)
			);
			fallbackOrder = [...fallbackOrder, ...remainingProviders];
		}

		// Then add providers according to fallback order
		for (const name of fallbackOrder) {
			// Skip the already added primary provider
			if (name !== normalizedProviderName && providers[name]) {
				allProviders.push(providers[name]);
			}
		}

		if (allProviders.length === 0) {
			throw new Error(
				"No valid providers found for fallback chain. Please check your API keys."
			);
		}

		// SECURITY FIX: Log the provider chain safely if in debug mode
		if (process.env.DEBUG) {
			// Sanitize provider names to prevent information leakage
			const safeProviderNames = allProviders.map((p, index) => `Provider_${index + 1}`);
			console.log(`Provider fallback chain: ${safeProviderNames.join(" → ")}`);
		}

		// Create fallback provider with ordered list of providers
		return new FallbackProvider(allProviders);
	}

	static getAvailableProviders() {
		const providers = {
			dashscope: process.env.DASHSCOPE_API_KEY,
			xai: process.env.XAI_API_KEY,
			openai: process.env.OPENAI_API_KEY,
			azuredeepseek: process.env.AZURE_DEEPSEEK_API_KEY,
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
			azuredeepseek: "AZURE_DEEPSEEK_API_KEY",
			deepseek: "DEEPSEEK_API_KEY",
			gemini: "GEMINI_API_KEY",
		};

		const envKey = envVarMap[providerName.toLowerCase()];
		return envKey && !!process.env[envKey];
	}
}

module.exports = ProviderFactory;
