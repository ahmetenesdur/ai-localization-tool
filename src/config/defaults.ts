import type { LocalizationConfig } from "@/types";

/**
 * Default Localization Configuration
 * This is the default configuration used when no config file is found
 */
export const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
	version: "1.0.0",
	source: "en",
	targets: [],
	localesDir: "./locales",
	apiProvider: "deepseek",
	useFallback: true,
	fallbackOrder: ["deepseek", "openai", "gemini"],
	apiConfig: {
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		openai: {
			model: "gpt-4o-mini",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
		gemini: {
			model: "gemini-2.5-flash-lite",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
		dashscope: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		xai: {
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
	},
	concurrencyLimit: 5,
	cacheEnabled: true,
	cacheTTL: 24 * 60 * 60 * 1000,
	cacheSize: 1000,
	rateLimiter: {
		enabled: true,
		providerLimits: {
			openai: { rpm: 300, concurrency: 5 },
			deepseek: { rpm: 30, concurrency: 2 },
			gemini: { rpm: 300, concurrency: 5 },
			dashscope: { rpm: 80, concurrency: 6 },
			xai: { rpm: 80, concurrency: 8 },
		},
		queueStrategy: "priority",
		adaptiveThrottling: true,
		queueTimeout: 30000,
	},
	retryOptions: {
		maxRetries: 2,
		initialDelay: 1000,
		maxDelay: 10000,
		jitter: true,
		retryableErrors: ["rate_limit", "timeout", "network", "server", "unknown"],
		perProviderRetry: {},
	},
	context: {
		enabled: true,
		useAI: false,
		aiProvider: "openai",
		minTextLength: 50,
		allowNewCategories: true,
		debug: false,
		analysisOptions: {
			model: "gpt-4o-mini",
			temperature: 0.2,
			maxTokens: 1000,
		},
		detection: {
			threshold: 2,
			minConfidence: 0.6,
		},
		categories: {
			technical: {
				keywords: ["API", "backend", "database", "server"],
				prompt: "Preserve technical terms",
				weight: 1.3,
			},
			marketing: {
				keywords: ["brand", "campaign", "customer"],
				prompt: "Use engaging language",
				weight: 1.1,
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
			markdownPreservation: true,
			specialCharacters: true,
			codeBlockPreservation: true,
		},
		autoFix: true,
	},
	styleGuide: {
		formality: "neutral",
		toneOfVoice: "professional",
		conventions: {
			useOxfordComma: true,
			useSentenceCase: true,
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
				byLanguage: {},
				byContext: {},
			},
		},
	},
	fileOperations: {
		atomic: true,
		createMissingDirs: true,
		backupFiles: false,
		backupDir: "./backups",
		encoding: "utf8",
		jsonIndent: 2,
	},
	logging: {
		verbose: false,
		diagnosticsLevel: "normal",
		outputFormat: "pretty",
		saveErrorLogs: true,
		logDirectory: "./logs",
		includeTimestamps: true,
		logRotation: {
			enabled: true,
			maxFiles: 5,
			maxSize: "10MB",
		},
	},
	syncOptions: {
		enabled: true,
		removeDeletedKeys: true,
		retranslateModified: true,
		backupBeforeSync: false,
	},
	advanced: {
		timeoutMs: 30000,
		maxKeyLength: 10000,
		maxBatchSize: 50,
		autoOptimize: true,
		debug: false,
	},
};

export default DEFAULT_LOCALIZATION_CONFIG;
