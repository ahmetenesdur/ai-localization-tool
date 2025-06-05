const BaseProvider = require("./base-provider");

/**
 * Azure DeepSeek Provider - Extends BaseProvider for Azure DeepSeek API
 * REFACTORED: Eliminated code duplication using BaseProvider with Azure-specific overrides
 */
class AzureDeepSeekProvider extends BaseProvider {
	constructor() {
		super({
			name: "azuredeepseek",
			baseURL:
				process.env.AZURE_DEEPSEEK_ENDPOINT ||
				"https://DeepSeek-R1-fbbcn.eastus2.models.ai.azure.com",
			apiKeyEnvVar: "AZURE_DEEPSEEK_API_KEY",
			defaultModel: "DeepSeek-R1",
			timeout: 30000,
		});
	}

	/**
	 * Azure uses different endpoint structure
	 */
	_getTranslateEndpoint() {
		return "/inference";
	}

	/**
	 * Azure analysis endpoint
	 */
	_getAnalyzeEndpoint() {
		return "/inference";
	}

	/**
	 * Azure uses different authentication header
	 */
	_prepareHeaders(apiKey) {
		// Azure doesn't use Bearer, needs AzureKeyCredential
		return {};
	}

	/**
	 * Azure-specific response validation
	 */
	_extractResponse(response, operation = "translate") {
		// Check for Azure API errors
		if (response.status !== "200") {
			throw new Error(
				`Azure DeepSeek API returned status ${response.status}: ${
					response.body?.error?.message || "Unknown error"
				}`
			);
		}

		// Validate Azure response format
		if (!response.body?.choices?.[0]?.message?.content) {
			throw new Error("Invalid response format from Azure DeepSeek API");
		}

		return response.body.choices[0].message.content.trim();
	}

	/**
	 * Override make request to use Azure client
	 */
	async _makeRequest(endpoint, requestData, headers, options = {}) {
		// Azure DeepSeek requires special client setup
		const { ModelClient } = require("@azure-rest/ai-inference");
		const { AzureKeyCredential } = require("@azure/core-auth");

		const apiKey = this._getApiKey();
		const client = new ModelClient(this.baseURL, new AzureKeyCredential(apiKey));

		const result = await client.path(endpoint).post({
			contentType: "application/json",
			body: requestData,
		});

		return {
			status: result.status,
			body: result.body,
			data: result.body, // For compatibility with axios response format
		};
	}
}

// Create and export instance
const azureDeepseekProvider = new AzureDeepSeekProvider();

module.exports = {
	translate: (text, sourceLang, targetLang, options) =>
		azureDeepseekProvider.translate(text, sourceLang, targetLang, options),
	analyze: (prompt, options) => azureDeepseekProvider.analyze(prompt, options),
};
