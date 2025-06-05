const BaseProvider = require("./base-provider");

/**
 * DeepSeek Provider - Extends BaseProvider for DeepSeek API
 * REFACTORED: Eliminated code duplication using BaseProvider
 */
class DeepSeekProvider extends BaseProvider {
	constructor() {
		super({
			name: "deepseek",
			baseURL: "https://api.deepseek.com/v1",
			apiKeyEnvVar: "DEEPSEEK_API_KEY",
			defaultModel: "deepseek-chat",
			timeout: 30000,
		});
	}

	// DeepSeek uses OpenAI-compatible format, so no overrides needed
}

// Create and export instance
const deepseekProvider = new DeepSeekProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		deepseekProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => deepseekProvider.analyze(prompt, options),
};
