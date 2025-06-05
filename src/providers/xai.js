const BaseProvider = require("./base-provider");

/**
 * XAI Provider - Extends BaseProvider for X.AI API
 * REFACTORED: Eliminated code duplication using BaseProvider
 */
class XAIProvider extends BaseProvider {
	constructor() {
		super({
			name: "xai",
			baseURL: "https://api.x.ai/v1",
			apiKeyEnvVar: "XAI_API_KEY",
			defaultModel: "grok-2-1212",
			timeout: 30000,
		});
	}

	// XAI uses OpenAI-compatible format, so no overrides needed
}

// Create and export instance
const xaiProvider = new XAIProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		xaiProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => xaiProvider.analyze(prompt, options),
};
