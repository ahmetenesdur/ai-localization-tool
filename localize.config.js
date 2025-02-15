// localize.config.js
module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr"], // Target languages

	// Translation Quality
	context: {
		default: "general",
		enabled: true, // Instead of contextDetection
		patterns: {
			defi: "(\\bswap\\b|\\bliquidity\\b|\\bpool\\b|\\byield\\b|\\bstaking\\b|\\bfarming\\b|\\bAPY\\b|\\bslippage\\b|\\bDEX\\b|\\baggregator\\b)",
			trading:
				"(\\bprice\\b|\\bvolume\\b|\\bmarket\\b|\\border\\b|\\bexecution\\b|\\bspread\\b|\\bfee\\b|\\bgas\\b|\\broute\\b)",
			blockchain:
				"(\\bwallet\\b|\\bcontract\\b|\\btransaction\\b|\\bblock\\b|\\bnetwork\\b|\\bchain\\b|\\btoken\\b|\\bbridge\\b|\\bprotocol\\b)",
			technical:
				"(\\bAPI\\b|\\bendpoint\\b|\\bconfig\\b|\\bsync\\b|\\bcache\\b|\\bvalidate\\b|\\boptimize\\b)",
		},
		priority: ["defi", "trading", "blockchain", "technical"],
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
