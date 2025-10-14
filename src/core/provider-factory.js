const deepseekProvider = require("../providers/deepseek");
const geminiProvider = require("../providers/gemini");
const openaiProvider = require("../providers/openai");
const dashscopeProvider = require("../providers/dashscope");
const xaiProvider = require("../providers/xai");
const FallbackProvider = require("./fallback-provider");
const rateLimiter = require("../utils/rate-limiter");

class ProviderFactory {
	/**
	 * Get provider with intelligent fallback
	 */
	static getProvider(providerName, useFallback = true, config = null) {
		const providers = {
			dashscope: dashscopeProvider,
			xai: xaiProvider,
			openai: openaiProvider,
			deepseek: deepseekProvider,
			gemini: geminiProvider,
		};

		const normalizedProviderName = (providerName || "").toLowerCase();

		if (!useFallback) {
			const selected = providers[normalizedProviderName];
			if (!selected) {
				throw new Error(`Provider ${providerName} not found or not configured`);
			}

			if (!this.isProviderConfigured(normalizedProviderName)) {
				throw new Error(`Provider ${providerName} is not configured. Missing API key.`);
			}

			const wrappedProvider = {};

			if (selected.translate) {
				wrappedProvider.translate = (text, sourceLang, targetLang, options) => {
					const priority = text.length < 100 ? 1 : 0;
					return rateLimiter.enqueue(
						normalizedProviderName,
						() => selected.translate(text, sourceLang, targetLang, options),
						priority
					);
				};
			}

			if (selected.analyze) {
				wrappedProvider.analyze = (prompt, options) => {
					return rateLimiter.enqueue(normalizedProviderName, () =>
						selected.analyze(prompt, options)
					);
				};
			}

			return wrappedProvider;
		}

		const allProviders = [];
		const availableProviderNames = this.getAvailableProviders();

		if (
			normalizedProviderName &&
			providers[normalizedProviderName] &&
			availableProviderNames.includes(normalizedProviderName)
		) {
			allProviders.push({
				name: normalizedProviderName,
				implementation: providers[normalizedProviderName],
			});
		} else if (normalizedProviderName) {
			console.warn(
				`Provider '${providerName}' not found or not configured, using default provider chain`
			);
		}

		let fallbackOrder = availableProviderNames;
		if (config?.fallbackOrder && Array.isArray(config.fallbackOrder)) {
			fallbackOrder = config.fallbackOrder
				.filter((name) => availableProviderNames.includes(name.toLowerCase()))
				.map((name) => name.toLowerCase());

			const remainingProviders = availableProviderNames.filter(
				(name) => !fallbackOrder.includes(name)
			);
			fallbackOrder = [...fallbackOrder, ...remainingProviders];
		}

		for (const name of fallbackOrder) {
			if (!allProviders.some((p) => p.name === name) && providers[name]) {
				allProviders.push({ name, implementation: providers[name] });
			}
		}

		if (allProviders.length === 0) {
			throw new Error(
				"No valid providers found for fallback chain. Please check your API keys."
			);
		}

		if (process.env.DEBUG) {
			const safeProviderNames = allProviders.map(
				(p) => p.constructor?.name || "UnknownProvider"
			);
			console.log(`Provider fallback chain: ${safeProviderNames.join(" → ")}`);
		}

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

	static isProviderConfigured(providerName) {
		const envVarMap = {
			dashscope: "DASHSCOPE_API_KEY",
			xai: "XAI_API_KEY",
			openai: "OPENAI_API_KEY",
			deepseek: "DEEPSEEK_API_KEY",
			gemini: "GEMINI_API_KEY",
		};

		const envKey = envVarMap[providerName.toLowerCase()];
		return envKey && !!process.env[envKey];
	}
}

module.exports = ProviderFactory;
