// localize.config.js
module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr"], // Target languages

	// Translation Quality
	context: {
		default: "general",
		enabled: true,
		patterns: {
			defi: "(\\b(?:swap|liquidity|pool|yield|staking|farming|APY|slippage|DEX|aggregator|leverage|collateral|lending|borrowing|vault|governance|DAO|TVL|impermanent loss|flash loan)\\b)",

			trading:
				"(\\b(?:price|volume|market|order|execution|spread|fee|gas|route|chart|candle|trend|volatility|resistance|support|position|leverage|margin|stop-loss|take-profit|limit|spot|futures|options|derivatives)\\b)",

			blockchain:
				"(\\b(?:wallet|contract|transaction|block|network|chain|token|bridge|protocol|consensus|node|mining|hash|address|signature|nonce|gas|mainnet|testnet|sidechain|layer2|rollup|smart contract|web3|dApp|NFT|ERC|BEP)\\b)",

			technical:
				"(\\b(?:API|endpoint|config|sync|cache|validate|optimize|latency|throughput|middleware|backend|frontend|database|query|index|cluster|shard|load balance|failover|backup|recovery|deployment|monitoring|logging|debug|error handling|rate limit|webhook|SDK|authentication|authorization)\\b)",

			ui: "(\\b(?:button|modal|dialog|form|input|select|dropdown|menu|navigation|sidebar|header|footer|layout|grid|flex|responsive|mobile|desktop|tablet|theme|style|animation|transition|loading|error|success|warning|notification|tooltip|popup|scroll|swipe|drag|zoom|pan)\\b)",

			error: "(\\b(?:error|warning|invalid|failed|rejected|timeout|exceeded|insufficient|unauthorized|forbidden|not found|unavailable|maintenance|retry|fallback|recovery|backup|emergency|critical|fatal|bug|issue|incident|outage)\\b)",
		},
		priority: ["defi", "trading", "blockchain", "technical", "ui", "error"],

		contextRules: {
			// If multiple context matches, prioritize these
			combinationPriority: {
				"defi+trading": "defi",
				"blockchain+technical": "blockchain",
				"technical+error": "technical",
			},
		},
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
