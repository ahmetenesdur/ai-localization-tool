// localize.config.js
module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr"], // Target languages

	// Translation Quality
	context: {
		enabled: true,
		categories: {
			defi: [
				"DeFi",
				"liquidity pool",
				"yield farming",
				"staking",
				"APY",
				"TVL",
				"vault",
				"collateral",
			],
			dex: [
				"DEX aggregator",
				"swap",
				"slippage",
				"AMM",
				"liquidity provider",
				"cross-chain",
				"order book",
				"price impact",
			],
			technical: [
				"API",
				"blockchain",
				"smart contract",
				"gas fee",
				"node",
			],
		},
		detectionThreshold: 2, // Minimum 2 keyword matches required
	},
	qualityChecks: true,

	// Style Settings
	styleGuide: {
		formality: "neutral",
		toneOfVoice: "professional",
	},

	// API Settings
	apiProvider: "qwen", // Preferred provider
	useFallback: true, // Enable/disable API fallback system
	apiConfig: {
		qwen: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.3,
		},
		azureDeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.3,
		},
	},
};
