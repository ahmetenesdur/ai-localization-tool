module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr", "de", "es", "fr", "hi", "ja", "pl", "ru", "th", "uk", "vi", "zh"], // Target languages

	// Performance Settings
	concurrencyLimit: 5, // Number of concurrent translations
	cacheEnabled: true, // Enable caching of translations
	cacheTTL: 24 * 60 * 60 * 1000, // Cache TTL in milliseconds (24 hours)
	cacheSize: 1000, // Maximum number of cached items

	// Translation Quality
	context: {
		enabled: true,
		// AI-based context analysis settings
		useAI: true, // Enable AI-based analysis
		aiProvider: "openai", // AI provider to use for analysis
		minTextLength: 50, // Minimum text length for AI analysis
		allowNewCategories: true, // Allow AI to suggest new categories
		debug: false, // Debug mode (shows detailed analysis information)
		analysisOptions: {
			model: "gpt-4o", // Model to use for analysis
			temperature: 0.2, // Lower temperature gives more consistent results
			maxTokens: 1000, // Maximum token count for analysis
		},
		detection: {
			threshold: 2, // Minimum number of keyword matches
			minConfidence: 0.6, // Minimum confidence score
		},
		categories: {
			technical: {
				keywords: [
					"API",
					"backend",
					"database",
					"server",
					"endpoint",
					"function",
					"method",
					"class",
					"object",
					"variable",
				],
				prompt: "Preserve technical terms and variable names",
				weight: 1.3,
			},
			defi: {
				keywords: [
					"DeFi",
					"staking",
					"yield",
					"liquidity",
					"token",
					"blockchain",
					"crypto",
					"wallet",
					"smart contract",
				],
				prompt: "Keep DeFi terms in English",
				weight: 1.2,
			},
			marketing: {
				keywords: [
					"brand",
					"campaign",
					"customer",
					"audience",
					"promotion",
					"value",
					"benefit",
					"feature",
				],
				prompt: "Use persuasive and engaging language appropriate for marketing content",
				weight: 1.1,
			},
			legal: {
				keywords: [
					"terms",
					"conditions",
					"privacy",
					"policy",
					"agreement",
					"compliance",
					"regulation",
					"law",
				],
				prompt: "Maintain formal tone and precise legal terminology",
				weight: 1.4,
			},
			ui: {
				keywords: [
					"button",
					"click",
					"menu",
					"screen",
					"page",
					"view",
					"interface",
					"select",
					"tap",
				],
				prompt: "Keep UI terms consistent and clear, maintain proper formatting for UI elements",
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
			placeholderConsistency: true, // Check for consistent placeholders
			htmlTagsConsistency: true, // Check for consistent HTML tags
			punctuationCheck: true, // Check for consistent punctuation
			lengthValidation: true, // Validate text length
			sanitizeOutput: true, // Sanitize output
		},
	},

	// Style Settings
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // professional, friendly, casual
	},

	// Error Handling
	retryOptions: {
		maxRetries: 2, // Maximum number of retries
		initialDelay: 1000, // Initial delay in milliseconds
		maxDelay: 10000, // Maximum delay in milliseconds
	},

	// API Settings
	apiProvider: "dashscope", // Preferred provider
	useFallback: true, // Enable/disable API fallback system
	apiConfig: {
		dashscope: {
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
			maxTokens: 2000,
		},
		azureDeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
			maxTokens: 2000,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
			maxTokens: 2000,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
			maxTokens: 2000,
		},
	},

	lengthControl: {
		mode: "smart", // strict, flexible, exact, relaxed, smart
		rules: {
			strict: 0.1, // Maximum length difference ratio
			flexible: 0.3, // Maximum length difference ratio
			exact: 0.05, // Maximum length difference ratio
			relaxed: 0.5, // Maximum length difference ratio
			smart: {
				default: 0.15, // Default maximum length difference ratio
				byLanguage: {
					ja: { max: 0.35, min: -0.2 }, // Japanese
					zh: { max: 0.35, min: -0.2 }, // Chinese
					th: { max: 0.3, min: -0.15 }, // Thai
					vi: { max: 0.25, min: -0.15 }, // Vietnamese
					hi: { max: 0.2, min: -0.1 }, // Hindi
					ru: { max: 0.25, min: -0.15 }, // Russian
					uk: { max: 0.25, min: -0.15 }, // Ukrainian
					pl: { max: 0.2, min: -0.1 }, // Polish
					de: { max: 0.15, min: -0.1 }, // German
					fr: { max: 0.15, min: -0.1 }, // French
					es: { max: 0.15, min: -0.1 }, // Spanish
					tr: { max: 0.15, min: -0.1 }, // Turkish
				},
				byContext: {
					technical: { max: 0.2, min: -0.1 },
					marketing: { max: 0.3, min: -0.15 },
					legal: { max: 0.1, min: -0.05 },
					general: { max: 0.15, min: -0.1 },
				},
			},
		},
	},
};
