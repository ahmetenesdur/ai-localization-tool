const BaseProvider = require("./base-provider");

/**
 * OpenAI Provider - Extends BaseProvider for OpenAI API
 * REFACTORED: Eliminated code duplication using BaseProvider
 */
class OpenAIProvider extends BaseProvider {
	constructor() {
		super({
			name: "openai",
			baseURL: "https://api.openai.com/v1",
			apiKeyEnvVar: "OPENAI_API_KEY",
			defaultModel: "gpt-4o",
			timeout: 30000,
		});
	}

	// OpenAI uses the default implementation from BaseProvider
	// No overrides needed since BaseProvider is designed around OpenAI format
}

// Create and export instance
const openaiProvider = new OpenAIProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		openaiProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => openaiProvider.analyze(prompt, options),
};
