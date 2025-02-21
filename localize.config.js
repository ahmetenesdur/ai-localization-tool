module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: [
		"tr",
		"de",
		"es",
		"fr",
		"hi",
		"ja",
		"pl",
		"ru",
		"th",
		"uk",
		"vi",
		"zh",
	], // Target languages

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
			sanitizeOutput: true,
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
		xai: {
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
		},
		azureDeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
		},
	},

	lengthControl: {
		mode: "smart",
		rules: {
			strict: 0.1,
			flexible: 0.3,
			exact: 0.05,
			relaxed: 0.5,
			smart: {
				default: 0.15,
				byLanguage: {
					ja: { max: 0.35, min: -0.2 },
					zh: { max: 0.35, min: -0.2 },
					th: { max: 0.3, min: -0.15 },
					vi: { max: 0.25, min: -0.15 },
					hi: { max: 0.2, min: -0.1 },
					ru: { max: 0.25, min: -0.15 },
					uk: { max: 0.25, min: -0.15 },
					pl: { max: 0.2, min: -0.1 },
					de: { max: 0.15, min: -0.1 },
					fr: { max: 0.15, min: -0.1 },
					es: { max: 0.15, min: -0.1 },
					tr: { max: 0.15, min: -0.1 },
				},
				byContext: {
					technical: { max: 0.2, min: -0.1 },
					marketing: { max: 0.3, min: -0.15 },
					legal: { max: 0.1, min: -0.05 },
					general: { max: 0.15, min: -0.1 }
				}
			}
		}
	},
};
