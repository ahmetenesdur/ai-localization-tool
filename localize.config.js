module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr"], // Target languages

	// Translation Quality
	context: {
		enabled: true,
		detection: {
			threshold: 2,
			minConfidence: 0.6,
		},
		categories: {
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Preserve technical terms and variable names",
				weight: 1.3,
			},
			defi: {
				keywords: ["DeFi", "staking", "yield"],
				prompt: "Keep DeFi terms in English",
				weight: 1.2,
			},
		},
		fallback: {
			category: "general",
			prompt: "Provide a natural translation",
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
