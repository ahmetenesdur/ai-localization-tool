/**
 * Localization Tool Configuration
 * Version: 1.0.0
 *
 * This configuration file controls all aspects of the localization tool
 * including API providers, performance settings, and quality controls.
 */

module.exports = {
	/**
	 * Basic Configuration
	 */
	version: "1.0.0", // Configuration version
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr", "de", "es", "fr", "hi", "ja", "pl", "ru", "th", "uk", "vi", "yo", "zh"], // Target languages

	/**
	 * API Provider Configuration
	 */
	apiProvider: "deepseek", // Default/primary provider
	useFallback: true, // Enable automatic fallback to other providers if primary fails
	fallbackOrder: ["dashscope", "xai", "openai", "azuredeepseek", "deepseek", "gemini"], // Provider fallback order
	apiConfig: {
		dashscope: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000, // Maximum context window size
		},
		xai: {
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
		azuredeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
	},

	/**
	 * Performance Optimization
	 */
	// Concurrency and Cache Settings
	concurrencyLimit: 5, // Global limit for concurrent translations
	cacheEnabled: true, // Enable translation caching
	cacheTTL: 24 * 60 * 60 * 1000, // Cache TTL in milliseconds (24 hours)
	cacheSize: 1000, // Maximum number of cached items

	// Rate Limiter Configuration
	rateLimiter: {
		enabled: true, // Enable rate limiting
		providerLimits: {
			dashscope: { rpm: 50, concurrency: 4 }, // Requests per minute & concurrency
			xai: { rpm: 60, concurrency: 5 },
			openai: { rpm: 60, concurrency: 5 },
			azuredeepseek: { rpm: 80, concurrency: 5 },
			deepseek: { rpm: 60, concurrency: 5 }, // Increased limits
			gemini: { rpm: 100, concurrency: 8 },
		},
		queueStrategy: "priority", // priority, fifo
		adaptiveThrottling: true, // Auto-adjust based on API responses
		queueTimeout: 120000, // Maximum time in queue before timing out (ms) - increased to 2 minutes
	},

	/**
	 * Error Handling and Reliability
	 */
	retryOptions: {
		maxRetries: 2, // Global maximum retry attempts
		initialDelay: 1000, // Initial delay before first retry (ms)
		maxDelay: 10000, // Maximum delay cap for exponential backoff (ms)
		jitter: true, // Add random jitter to retry delays
		retryableErrors: [
			"rate_limit", // Rate limit exceeded
			"timeout", // Request timeout
			"network", // Network errors
			"server", // Server errors (5xx)
			"unknown", // Unknown errors
		],
		perProviderRetry: {
			dashscope: { maxRetries: 3 },
			openai: { maxRetries: 2 },
		},
	},

	/**
	 * Translation Quality and Context
	 */
	// Context Detection System
	context: {
		enabled: true, // Enable context detection
		useAI: true, // Use AI for context analysis
		aiProvider: "openai", // AI provider for context analysis
		minTextLength: 50, // Minimum text length for AI analysis
		allowNewCategories: true, // Allow AI to suggest new categories
		debug: false, // Show detailed analysis information
		analysisOptions: {
			model: "gpt-4o", // OpenAI model for analysis
			temperature: 0.2, // Slightly higher temperature for more creative context analysis
			maxTokens: 1000, // Maximum tokens for analysis
		},
		detection: {
			threshold: 2, // Minimum keyword matches
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

	// Quality Checks
	qualityChecks: {
		enabled: true, // Enable quality checks
		rules: {
			placeholderConsistency: true, // Check placeholders
			htmlTagsConsistency: true, // Check HTML tags
			punctuationCheck: true, // Check punctuation
			lengthValidation: true, // Check text length
			sanitizeOutput: true, // Clean output text
			markdownPreservation: true, // Preserve markdown
			specialCharacters: true, // Maintain special characters
			codeBlockPreservation: true, // Preserve code blocks
		},
		autoFix: true, // Auto-fix common issues
	},

	// Style Guide
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // professional, friendly, casual, technical
		conventions: {
			useOxfordComma: true, // Use Oxford comma in lists
			useSentenceCase: true, // Use sentence case for headings
		},
	},

	// Length Control
	lengthControl: {
		mode: "smart", // strict, flexible, exact, relaxed, smart
		rules: {
			strict: 0.1, // 10% deviation
			flexible: 0.3, // 30% deviation
			exact: 0.05, // 5% deviation
			relaxed: 0.5, // 50% deviation
			smart: {
				default: 0.15, // Default tolerance
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

	/**
	 * File Operations and System Settings
	 */
	fileOperations: {
		atomic: true, // Use atomic file operations
		createMissingDirs: true, // Create missing directories
		backupFiles: false, // Create backups before modifying
		backupDir: "./backups", // Backup directory
		encoding: "utf8", // File encoding
		jsonIndent: 2, // JSON indentation spaces
	},

	/**
	 * Logging and Diagnostics
	 */
	logging: {
		verbose: false, // Enable verbose logging
		diagnosticsLevel: "normal", // minimal, normal, detailed
		outputFormat: "pretty", // pretty, json, minimal
		saveErrorLogs: true, // Save error logs to file
		logDirectory: "./logs", // Directory for log files
		includeTimestamps: true, // Include timestamps in logs
		logRotation: {
			enabled: true, // Enable log rotation
			maxFiles: 5, // Maximum number of log files to keep
			maxSize: "10MB", // Maximum size of log files
		},
	},

	/**
	 * Synchronization Settings
	 * Controls how source file changes are synchronized to target files
	 */
	syncOptions: {
		enabled: true, // Enable synchronization features
		removeDeletedKeys: true, // Remove deleted keys from target files
		retranslateModified: true, // Re-translate modified keys
		backupBeforeSync: false, // Create backup before sync operations
	},

	/**
	 * Advanced Settings
	 * Generally you shouldn't need to modify these
	 */
	advanced: {
		timeoutMs: 60000, // Global request timeout (ms)
		maxKeyLength: 10000, // Maximum key length for translation
		maxBatchSize: 50, // Maximum batch size for operations
		autoOptimize: true, // Automatically optimize settings for hardware
		debug: false, // Enable debug mode with additional information
	},
};
