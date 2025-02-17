module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr"], // Target languages

	// Translation Quality
	context: {
		enabled: true,
		mode: "auto", // "auto", "manual", "hybrid"
		categories: {
			defi: {
				keywords: [
					"DeFi",
					"liquidity pool",
					"yield farming",
					"staking",
					"APY",
					"TVL",
					"DEX",
					"AMM",
					"swap",
					"lending",
					"borrowing",
					"collateral",
					"leverage",
					"vault",
					"governance token",
					"smart contract",
					"protocol",
					"blockchain",
				],
				prompt: "This text is about DeFi (Decentralized Finance). Preserve technical terms and protocol names. Ensure accurate translation of financial terms.",
				weight: 1.2,
			},
			finance: {
				keywords: [
					"investment",
					"portfolio",
					"trading",
					"market",
					"stock",
					"bond",
					"dividend",
					"asset",
					"ROI",
					"profit",
					"loss",
					"balance sheet",
					"hedge",
					"volatility",
					"liquidity",
					"margin",
					"derivatives",
					"futures",
				],
				prompt: "This text is about traditional finance. Ensure accurate and consistent translation of financial terms. Preserve technical terms.",
				weight: 1.1,
			},
			technical: {
				keywords: [
					"API",
					"SDK",
					"backend",
					"frontend",
					"database",
					"encryption",
					"protocol",
					"node",
					"network",
					"consensus",
					"hash",
					"mining",
					"validator",
					"gas fee",
					"transaction",
					"wallet",
					"private key",
					"public key",
					"signature",
				],
				prompt: "This is a technical text. Preserve technical terms, variable names, and protocol names. Prioritize technical accuracy.",
				weight: 1.3,
			},
		},
		detection: {
			threshold: 2,
			algorithm: "weighted", // "simple", "weighted"
			minConfidence: 0.6,
		},
		fallback: {
			category: "general",
			prompt: "Provide a general translation. Preserve technical terms and proper names.",
		},
	},
	qualityChecks: {
		enabled: true,
		rules: {
			placeholderConsistency: true,
			htmlTagsConsistency: true,
			punctuationCheck: true,
			lengthValidation: true,
			styleGuideChecks: true,
		},
	},

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
			temperature: 0.1,
		},
		azureDeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
		},
	},

	lengthControl: {
		mode: "strict", // "flexible", "strict", "exact", "loose"
	},
};
