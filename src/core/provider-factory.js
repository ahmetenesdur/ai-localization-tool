const deepseekProvider = require("../providers/deepseek");
const geminiProvider = require("../providers/gemini");
const azureDeepseekProvider = require("../providers/azure-deepseek");
const openaiProvider = require("../providers/openai");
const dashscopeProvider = require("../providers/dashscope");
const xaiProvider = require("../providers/xai");
const FallbackProvider = require("./fallback-provider");

class ProviderFactory {
	static getProvider(providerName, useFallback = true) {
		const providers = {
			dashscope: dashscopeProvider,
			xai: xaiProvider,
			openai: openaiProvider,
			azuredeepseek: azureDeepseekProvider,
			deepseek: deepseekProvider,
			gemini: geminiProvider,
		};

		if (!useFallback) {
			const selected = providers[providerName.toLowerCase()] || dashscopeProvider;
			if (!selected) {
				throw new Error(`Provider ${providerName} not found`);
			}
			return selected;
		}

		// For fallback mode, create array with selected provider first,
		// then all remaining providers
		const allProviders = [];

		// First add the selected provider if available
		const primaryProvider = providers[providerName.toLowerCase()];
		if (primaryProvider) {
			allProviders.push(primaryProvider);
		} else {
			console.warn(`Provider '${providerName}' not found, using default provider chain`);
		}

		// Then add all other providers, skipping the one already added
		Object.entries(providers).forEach(([key, provider]) => {
			if (key.toLowerCase() !== providerName.toLowerCase() && provider) {
				allProviders.push(provider);
			}
		});

		if (allProviders.length === 0) {
			throw new Error("No valid providers found for fallback chain");
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
}

module.exports = ProviderFactory;
