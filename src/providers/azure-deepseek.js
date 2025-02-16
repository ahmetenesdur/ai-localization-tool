const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { getPrompt } = require("../utils/prompt-templates");

async function translate(text, sourceLang, targetLang, options) {
	const endpoint =
		process.env.AZURE_DEEPSEEK_ENDPOINT ||
		"https://DeepSeek-R1-fbbcn.eastus2.models.ai.azure.com";
	const apiKey = process.env.AZURE_DEEPSEEK_API_KEY;
	const model = options.apiConfig?.azureDeepseek?.model || "DeepSeek-R1";
	const temperature = options.apiConfig?.azureDeepseek?.temperature || 0.3;
	const maxTokens = options.apiConfig?.azureDeepseek?.maxTokens || 2048;

	if (!apiKey) {
		throw new Error("Azure DeepSeek API key not found");
	}

	const client = new ModelClient(endpoint, new AzureKeyCredential(apiKey));
	const promptData = getPrompt("azuredeepseek", sourceLang, targetLang, {
		...options,
		text,
	});

	try {
		const response = await client.path("/chat/completions").post({
			body: {
				...promptData,
				max_tokens: maxTokens,
				temperature: temperature,
				model: model,
			},
		});

		if (response.status !== "200") {
			throw response.body.error;
		}

		return response.body.choices[0].message.content.trim();
	} catch (err) {
		console.error("[Azure DeepSeek Provider] Translation error:", {
			error: err.response?.data || err.message,
			source: sourceLang,
			target: targetLang,
		});
		throw new Error(
			`[Azure DeepSeek Provider] Translation failed: ${err.message}`
		);
	}
}

module.exports = { translate };
