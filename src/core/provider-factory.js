const deepseekProvider = require("../providers/deepseek");
const geminiProvider = require("../providers/gemini");
const azureDeepseekProvider = require("../providers/azure-deepseek");
const openaiProvider = require("../providers/openai");
const qwenProvider = require("../providers/qwen");
const xaiProvider = require("../providers/xai");
const FallbackProvider = require("./fallback-provider");

class ProviderFactory {
	static getProvider(providerName, useFallback = true) {
		const providers = {
			qwen: qwenProvider,
			xai: xaiProvider,
			openai: openaiProvider,
			azuredeepseek: azureDeepseekProvider,
			deepseek: deepseekProvider,
			gemini: geminiProvider,
		};

		if (!useFallback) {
			const selected =
				providers[providerName.toLowerCase()] || qwenProvider;
			if (!selected) {
				throw new Error(`Provider ${providerName} not found`);
			}
			return selected;
		}

		// Fallback order
		const fallbackOrder = [
			providers[providerName.toLowerCase()], // Primary preferred provider
			qwenProvider,
			xaiProvider,
			openaiProvider,
			azureDeepseekProvider,
			deepseekProvider,
			geminiProvider,
		].filter(Boolean); // Filter out undefined providers

		return new FallbackProvider(fallbackOrder);
	}
}

module.exports = ProviderFactory;
