/**
 * Core types and interfaces for AI Localization Tool
 */

// ===== PROVIDER TYPES =====

export interface ApiConfig {
	model: string;
	temperature: number;
	maxTokens: number;
	contextWindow: number;
}

export interface ProviderConfig {
	[key: string]: ApiConfig;
}

export interface TranslationOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	detectedContext?: ContextData;
	lengthControl?: LengthControlConfig;
	concurrencyLimit?: number;
}

export interface TranslationResult {
	key: string;
	translated: string;
	context?: ContextData;
	success: boolean;
	qualityChecks?: QualityResult;
	fromCache?: boolean;
	error?: string;
}

// ===== CONTEXT TYPES =====

export interface ContextCategory {
	keywords: string[];
	prompt: string;
	weight: number;
}

export interface ContextData {
	category: string;
	confidence: number;
	keywords?: string[];
	existingTranslation?: string | null;
}

export interface ContextConfig {
	enabled: boolean;
	useAI: boolean;
	aiProvider: string;
	minTextLength: number;
	allowNewCategories: boolean;
	debug: boolean;
	analysisOptions: {
		model: string;
		temperature: number;
		maxTokens: number;
	};
	detection: {
		threshold: number;
		minConfidence: number;
	};
	categories: Record<string, ContextCategory>;
	fallback: {
		category: string;
		prompt: string;
	};
}

// ===== QUALITY TYPES =====

export interface QualityRules {
	placeholderConsistency: boolean;
	htmlTagsConsistency: boolean;
	punctuationCheck: boolean;
	lengthValidation: boolean;
	sanitizeOutput: boolean;
	markdownPreservation: boolean;
	specialCharacters: boolean;
	codeBlockPreservation: boolean;
}

export interface QualityConfig {
	enabled: boolean;
	rules: QualityRules;
	autoFix: boolean;
}

export interface QualityResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	fixedText: string;
	originalText: string;
}

// ===== RATE LIMITER TYPES =====

export interface ProviderLimits {
	rpm: number;
	concurrency: number;
}

export interface RateLimiterConfig {
	enabled: boolean;
	providerLimits: Record<string, ProviderLimits>;
	queueStrategy: "fifo" | "priority";
	adaptiveThrottling: boolean;
	queueTimeout: number;
}

export interface RateLimiterStatus {
	queueSize: number;
	processing: number;
	requestsUsed: number;
	requestsLimit: number;
	resetIn: number;
	errorRate: number;
	adjustments: {
		rpm: number;
		concurrency: number;
	};
	config: {
		maxConcurrent: number;
		rpm: number;
	};
}

// ===== LENGTH CONTROL TYPES =====

export interface LanguageConstraints {
	max: number;
	min: number;
}

export interface LengthControlRules {
	strict: number;
	flexible: number;
	exact: number;
	relaxed: number;
	smart: {
		default: number;
		byLanguage: Record<string, LanguageConstraints>;
		byContext: Record<string, LanguageConstraints>;
	};
}

export interface LengthControlConfig {
	mode: "strict" | "flexible" | "exact" | "relaxed" | "smart";
	rules: LengthControlRules;
}

// ===== STYLE GUIDE TYPES =====

export interface StyleGuideConventions {
	useOxfordComma: boolean;
	useSentenceCase: boolean;
}

export interface StyleGuideConfig {
	formality: "formal" | "neutral" | "informal";
	toneOfVoice: "professional" | "friendly" | "casual" | "technical";
	conventions: StyleGuideConventions;
}

// ===== FILE OPERATIONS TYPES =====

export interface FileOperationsConfig {
	atomic: boolean;
	createMissingDirs: boolean;
	backupFiles: boolean;
	backupDir: string;
	encoding: string;
	jsonIndent: number;
}

// ===== LOGGING TYPES =====

export interface LogRotationConfig {
	enabled: boolean;
	maxFiles: number;
	maxSize: string;
}

export interface LoggingConfig {
	verbose: boolean;
	diagnosticsLevel: "minimal" | "normal" | "detailed";
	outputFormat: "pretty" | "json" | "minimal";
	saveErrorLogs: boolean;
	logDirectory: string;
	includeTimestamps: boolean;
	logRotation: LogRotationConfig;
}

// ===== SYNC OPTIONS TYPES =====

export interface SyncOptions {
	enabled: boolean;
	removeDeletedKeys: boolean;
	retranslateModified: boolean;
	backupBeforeSync: boolean;
	stateDir?: string;
	stateFileName?: string;
}

// ===== RETRY OPTIONS TYPES =====

export interface RetryOptions {
	maxRetries: number;
	initialDelay: number;
	maxDelay: number;
	jitter: boolean;
	retryableErrors: string[];
	perProviderRetry: Record<string, { maxRetries: number }>;
}

// ===== ADVANCED OPTIONS TYPES =====

export interface AdvancedConfig {
	timeoutMs: number;
	maxKeyLength: number;
	maxBatchSize: number;
	autoOptimize: boolean;
	debug: boolean;
}

// ===== MAIN CONFIGURATION TYPE =====

export interface LocalizationConfig {
	version: string;
	localesDir: string;
	source: string;
	targets: string[];
	apiProvider: string;
	useFallback: boolean;
	fallbackOrder: string[];
	apiConfig: ProviderConfig;
	concurrencyLimit: number;
	cacheEnabled: boolean;
	cacheTTL: number;
	cacheSize: number;
	rateLimiter: RateLimiterConfig;
	retryOptions: RetryOptions;
	context: ContextConfig;
	qualityChecks: QualityConfig;
	styleGuide: StyleGuideConfig;
	lengthControl: LengthControlConfig;
	fileOperations: FileOperationsConfig;
	logging: LoggingConfig;
	syncOptions: SyncOptions;
	advanced: AdvancedConfig;
}

// ===== PROGRESS TYPES =====

export interface ProgressStats {
	language: string;
	processed: number;
	total: number;
	successful: number;
	failed: number;
	cached: number;
	startTime: number;
	elapsedTime: number;
	speed: number;
	percentage: number;
}

export interface ProgressOptions {
	showProgress?: boolean;
	updateInterval?: number;
	showStats?: boolean;
}

// ===== CACHE TYPES =====

export interface CacheStats {
	hits: number;
	misses: number;
	staleHits: number;
	stored: number;
	refreshes: number;
}

// ===== ERROR TYPES =====

export type ErrorType =
	| "rate_limit"
	| "timeout"
	| "network"
	| "server"
	| "auth"
	| "api"
	| "unknown";

export interface LocalizationError extends Error {
	type: ErrorType;
	provider?: string;
	statusCode?: number;
	originalError?: Error;
}

// ===== COMMAND TYPES =====

export interface CommandOptions {
	source?: string;
	targets?: string[];
	localesDir?: string;
	provider?: string;
	concurrency?: number;
	force?: boolean;
	debug?: boolean;
	verbose?: boolean;
	stats?: boolean;
	length?: "strict" | "flexible" | "exact" | "relaxed" | "smart";
}

// ===== LOCALE DATA TYPES =====

export interface LocaleData {
	[key: string]: string | LocaleData;
}

export interface LocaleFile {
	path: string;
	lang: string;
	data: LocaleData;
	hash: string;
}

// ===== SYNC ANALYSIS TYPES =====

export interface SyncAnalysisResult {
	newKeys: string[];
	modifiedKeys: string[];
	deletedKeys: string[];
	unchangedKeys: string[];
}
