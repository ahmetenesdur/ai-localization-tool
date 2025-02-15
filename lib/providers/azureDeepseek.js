import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

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

	const systemPrompt = `Professional translation from ${sourceLang} to ${targetLang}.
		Translation Requirements:
		- Context: ${options.context}
		- Formality: ${options.styleGuide.formality}
		- Tone: ${options.styleGuide.toneOfVoice}
		${options.qualityChecks ? "- Apply quality control checks" : ""}`;

	try {
		const response = await client.path("/chat/completions").post({
			body: {
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: text },
				],
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
		console.error(
			"Azure DeepSeek API error:",
			err.response?.data || err.message
		);
		throw new Error("Translation failed with Azure DeepSeek API");
	}
}

export { translate };
