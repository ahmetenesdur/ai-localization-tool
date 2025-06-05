/**
 * Constants - Centralized configuration constants
 * Eliminates magic numbers and provides configurable defaults
 */

module.exports = {
	// Rate Limiter Constants
	RATE_LIMITER: {
		DEFAULT_QUEUE_TIMEOUT: 30000, // 30 seconds
		DEFAULT_METRICS_WINDOW: 100, // Keep last 100 items
		METRICS_CLEANUP_INTERVAL: 2 * 60 * 1000, // 2 minutes
		ADAPTIVE_ADJUSTMENT_INTERVAL: 5 * 60 * 1000, // 5 minutes
		COUNTER_RESET_INTERVAL: 60000, // 1 minute
		ERROR_RATE_THRESHOLD: 0.1, // 10%
		LOW_ERROR_RATE_THRESHOLD: 0.02, // 2%
		RESPONSE_TIME_THRESHOLD: 2000, // 2 seconds
		MAX_CONCURRENCY_ADJUSTMENT: 1,
		MAX_RPM_ADJUSTMENT: 5,
		MIN_CONCURRENCY: 1,
		MIN_RPM: 10,
		QUEUE_WARNING_THRESHOLD: 5000, // Warn if queue time > 5 seconds
		DISABLE_PROVIDER_TIMEOUT: 5 * 60 * 1000, // 5 minutes disable timeout
		RESET_INTERVAL: 60000, // 1 minute reset interval
		CLEANUP_METRIC_INTERVAL: 2 * 60 * 1000, // 2 minutes cleanup
		ADJUSTMENT_INTERVAL: 5 * 60 * 1000, // 5 minutes adjustment
	},

	// Progress Tracker Constants
	PROGRESS_TRACKER: {
		DEFAULT_LOG_FREQUENCY: 20, // Log 20 times during process
		PROGRESS_BAR_WIDTH: 20, // Progress bar visual width
		MAX_RECENT_OPERATIONS: 10, // Keep last 10 operation times
		FIRST_ITEM_THRESHOLD: 1, // Log first item
		PERCENTAGE_PRECISION: 1, // 1 decimal place for percentage
		TIME_PRECISION: 1, // 1 decimal place for time
		SPEED_PRECISION: 2, // 2 decimal places for speed
		AVG_TIME_PRECISION: 0, // 0 decimal places for avg time (ms)
		SECONDS_IN_MINUTE: 60, // 60 seconds in minute
		SECONDS_IN_HOUR: 3600, // 3600 seconds in hour
		MS_TO_SECONDS: 1000, // Milliseconds to seconds conversion
		PERCENTAGE_MULTIPLIER: 100, // Convert ratio to percentage
		TIME_DISPLAY_PADDING: 10, // Time display padding
	},

	// File Manager Constants
	FILE_MANAGER: {
		DEFAULT_JSON_INDENT: 4, // JSON indentation spaces
		DEFAULT_ENCODING: "utf8", // File encoding
		DEFAULT_BACKUP_DIR: "./backups", // Backup directory
		BACKUP_TIMESTAMP_FORMAT: "timestamp", // Use timestamp for backups
		TEMP_FILE_RANDOM_LENGTH: 6, // Random string length for temp files
		MAX_CLEANUP_ATTEMPTS: 3, // Max attempts to clean temp files
	},

	// Cache Constants
	CACHE: {
		DEFAULT_MAX_SIZE: 1000, // Default cache size
		DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
		CONTEXT_CACHE_SIZE: 500, // AI context cache size
		TRANSLATION_CACHE_SIZE: 1000, // Translation cache size
		STALE_THRESHOLD: 0, // TTL threshold for stale entries
		HASH_TRUNCATE_LENGTH: 32, // Hash truncation for cache keys
		CLEANUP_PERCENTAGE: 0.25, // Clean 25% of oldest entries
		UTILIZATION_THRESHOLD: 0.9, // Clean cache at 90% capacity
	},

	// Validation Constants
	VALIDATION: {
		MAX_TEXT_LENGTH: 50000, // 50KB max text
		MAX_KEY_LENGTH: 1000, // Max translation key length
		MAX_LANG_CODE_LENGTH: 10, // Max language code length
		MAX_LANGUAGES_ARRAY: 50, // Max languages in array
		MAX_CONCURRENCY: 20, // Max concurrency limit
		MIN_CONCURRENCY: 1, // Min concurrency limit
		MAX_CONTEXT_THRESHOLD: 10, // Max context threshold
		MIN_CONTEXT_THRESHOLD: 1, // Min context threshold
		MAX_CONTEXT_CONFIDENCE: 1, // Max context confidence
		MIN_CONTEXT_CONFIDENCE: 0, // Min context confidence
		FILENAME_SANITIZE_REGEX: /[<>:"/\\|?*\x00-\x1f]/g, // Illegal filename chars
	},

	// API Provider Constants
	PROVIDERS: {
		DEFAULT_TIMEOUT: 30000, // 30 seconds
		DEFAULT_MODEL_TIMEOUT: 60000, // 60 seconds for model calls
		DEFAULT_MAX_TOKENS_TRANSLATE: 2000, // Translation max tokens
		DEFAULT_MAX_TOKENS_ANALYZE: 1000, // Analysis max tokens
		DEFAULT_TEMPERATURE_TRANSLATE: 0.3, // Translation temperature
		DEFAULT_TEMPERATURE_ANALYZE: 0.2, // Analysis temperature
		DEFAULT_RETRY_COUNT: 2, // Default retry attempts
		DEFAULT_RETRY_DELAY: 1000, // 1 second initial delay
		MAX_RETRY_DELAY: 10000, // 10 seconds max delay

		// Provider-specific limits
		OPENAI: {
			REQUESTS_PER_MINUTE: 60,
			MAX_CONCURRENT: 5,
		},
		DEEPSEEK: {
			REQUESTS_PER_MINUTE: 45,
			MAX_CONCURRENT: 3,
		},
		GEMINI: {
			REQUESTS_PER_MINUTE: 100,
			MAX_CONCURRENT: 8,
		},
		AZUREDEEPSEEK: {
			REQUESTS_PER_MINUTE: 80,
			MAX_CONCURRENT: 5,
		},
		DASHSCOPE: {
			REQUESTS_PER_MINUTE: 50,
			MAX_CONCURRENT: 4,
		},
		XAI: {
			REQUESTS_PER_MINUTE: 60,
			MAX_CONCURRENT: 5,
		},
	},

	// Context Analysis Constants
	CONTEXT: {
		MIN_TEXT_LENGTH: 50, // Minimum text length for AI analysis
		FAST_ANALYSIS_THRESHOLD: 500, // Use simplified prompt under this length
		MAX_TEXT_FOR_ANALYSIS: 1500, // Max text length for analysis
		DEFAULT_DETECTION_THRESHOLD: 2, // Keyword detection threshold
		DEFAULT_MIN_CONFIDENCE: 0.6, // Minimum confidence score
		KEYWORD_EXACT_MATCH_SCORE: 2, // Exact keyword match score
		KEYWORD_PARTIAL_MATCH_SCORE: 1, // Partial keyword match score
		CLOSE_CATEGORY_MATCH_SCORE: 2, // Close category name match score
		KEYWORD_SIMILARITY_SCORE: 0.75, // Keyword similarity score
		KEYWORD_ENHANCEMENT_SCORE: 1.5, // Enhanced keyword match score
		MAX_CONFIDENCE: 0.95, // Maximum confidence cap
		HIGH_CONFIDENCE_THRESHOLD: 0.85, // High confidence threshold
		MAX_BATCH_SIZE: 50, // Maximum batch size for processing
		MAX_CATEGORY_KEYWORDS: 1000, // Max keywords per category
		CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutes cleanup interval

		// Cache key generation
		SHORT_TEXT_LIMIT: 100, // Direct use limit
		MEDIUM_TEXT_LIMIT: 500, // Medium sampling limit
		LONG_TEXT_THRESHOLD: 2000, // Long text analysis threshold
		CACHE_SAMPLE_START: 40, // Start sample length
		CACHE_SAMPLE_MID: 20, // Middle sample length (each side)
		CACHE_SAMPLE_END: 40, // End sample length
		CACHE_SAMPLE_QUARTER: 30, // Quarter sample length
		CACHE_SAMPLE_QUARTER_MID: 25, // Quarter middle sample length

		// Context processing
		DEFAULT_CONFIDENCE: 0.5, // Default confidence for fallback
		DEFAULT_DEVIATION: 0.15, // Default length deviation
		MAX_KEYWORDS_DISPLAY: 10, // Max keywords to display
		MAX_NEW_CATEGORY_KEYWORDS: 20, // Max keywords for new categories
		KEYWORD_LIMIT_CHECK: 20, // Keywords to check for long text
		HIGH_SCORE_THRESHOLD: 10, // Early exit threshold for scoring
	},

	// Quality Check Constants
	QUALITY: {
		MAX_LENGTH_DEVIATION: 0.5, // 50% length deviation allowed
		MIN_LENGTH_RATIO: 0.3, // Minimum 30% of original length
		MAX_LENGTH_RATIO: 3.0, // Maximum 300% of original length
		SIMILARITY_THRESHOLD: 0.1, // 10% minimum difference required
		PLACEHOLDER_REGEX: /\{[^}]+\}/g, // Placeholder detection regex
		URL_REGEX: /https?:\/\/[^\s]+/g, // URL detection regex
		EMAIL_REGEX: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email regex
	},

	// System Optimization Constants
	SYSTEM: {
		MIN_MEMORY_GB: 4, // Minimum system memory for optimization
		MID_MEMORY_GB: 8, // Mid-range system memory
		MIN_CPU_CORES: 2, // Minimum CPU cores
		MID_CPU_CORES: 4, // Mid-range CPU cores

		// Concurrency optimization
		LOW_END_CONCURRENCY: 2, // Low-end system concurrency
		MID_RANGE_CONCURRENCY: 5, // Mid-range system concurrency
		HIGH_END_CONCURRENCY: 10, // High-end system concurrency
		CPU_UTILIZATION_FACTOR: 0.75, // CPU utilization factor
		MEMORY_SAFETY_FACTOR: 0.5, // Memory safety factor
	},

	// Debug and Logging Constants
	LOGGING: {
		QUEUE_WARNING_THRESHOLD: 5000, // Warn if queue time > 5 seconds
		PERFORMANCE_LOG_INTERVAL: 60000, // 1 minute performance logging
		CLEANUP_LOG_INTERVAL: 2 * 60 * 1000, // 2 minutes cleanup logging
		DEBUG_TRUNCATE_LENGTH: 100, // Truncate debug strings
		MAX_LOG_ENTRIES: 1000, // Maximum log entries to keep
		LOG_ROTATION_SIZE: 5, // Number of log files to keep
		PROCESS_EXIT_DELAY: 500, // Process exit delay for buffer flush
	},

	// Security Constants
	SECURITY: {
		MAX_PATH_DEPTH: 10, // Maximum path traversal depth allowed
		SENSITIVE_FIELDS: [
			"apiKey",
			"api_key",
			"password",
			"secret",
			"token",
			"auth",
			"authorization",
			"credential",
			"private",
			"key",
		], // Fields to sanitize in logs
		SANITIZED_REPLACEMENT: "[REDACTED]", // Replacement for sensitive data
		PATH_TRAVERSAL_PATTERNS: ["../", "..\\", "../", "..\\"], // Path traversal patterns
		INJECTION_PATTERNS: [";", "|", "&", "$", "`"], // Command injection patterns
	},

	// Error Handling Constants
	ERRORS: {
		MAX_ERROR_MESSAGE_LENGTH: 500, // Max error message length
		ERROR_CODE_PREFIX: "LOCALIZE_", // Error code prefix
		RETRY_EXPONENTIAL_BASE: 2, // Exponential backoff base
		RETRY_JITTER_FACTOR: 0.1, // Jitter factor for retries
		CONNECTION_TIMEOUT: 30000, // Connection timeout
		REQUEST_TIMEOUT: 60000, // Request timeout
		ERROR_TRUNCATE_LENGTH: 100, // Error message truncation
		PREVIEW_TRUNCATE_LENGTH: 50, // Preview text truncation
		STACK_TRUNCATE_LENGTH: 1000, // Stack trace truncation
	},

	// HTTP Status Codes
	HTTP_STATUS: {
		// Success codes
		OK: 200,
		CREATED: 201,

		// Client error codes
		BAD_REQUEST: 400,
		UNAUTHORIZED: 401,
		FORBIDDEN: 403,
		NOT_FOUND: 404,
		REQUEST_TIMEOUT: 408,
		TOO_MANY_REQUESTS: 429,
		TOO_EARLY: 425,
		RETRY_WITH: 449,

		// Server error codes
		INTERNAL_SERVER_ERROR: 500,
		BAD_GATEWAY: 502,
		SERVICE_UNAVAILABLE: 503,
		GATEWAY_TIMEOUT: 504,

		// Ranges for checking
		CLIENT_ERROR_MIN: 400,
		CLIENT_ERROR_MAX: 499,
		SERVER_ERROR_MIN: 500,
		SERVER_ERROR_MAX: 599,
	},

	// Performance Thresholds
	PERFORMANCE: {
		SLOW_OPERATION_THRESHOLD: 5000, // 5 seconds
		VERY_SLOW_OPERATION_THRESHOLD: 15000, // 15 seconds
		MEMORY_USAGE_WARNING: 0.8, // 80% memory usage warning
		CPU_USAGE_WARNING: 0.9, // 90% CPU usage warning
		CACHE_HIT_RATE_TARGET: 0.7, // 70% cache hit rate target
		ERROR_RATE_WARNING: 0.05, // 5% error rate warning
		RESPONSE_TIME_PENALTY_THRESHOLD: 5000, // 5 seconds response time penalty
		RESPONSE_TIME_PENALTY_MAX: 0.3, // Maximum 30% penalty
		CONSECUTIVE_FAILURE_PENALTY: 0.1, // 10% penalty per consecutive failure
		CONSECUTIVE_FAILURE_MAX_PENALTY: 0.5, // Maximum 50% penalty
	},

	// Version and Compatibility
	VERSION: {
		MAJOR: 1,
		MINOR: 0,
		PATCH: 0,
		BUILD: Date.now(),
	},

	// Feature Flags
	FEATURES: {
		ADAPTIVE_RATE_LIMITING: true,
		AI_CONTEXT_ANALYSIS: true,
		CACHE_COMPRESSION: false,
		METRICS_COLLECTION: true,
		AUTO_OPTIMIZATION: true,
		GRACEFUL_SHUTDOWN: false, // Not implemented yet
		HEALTH_MONITORING: false, // Not implemented yet
	},
};
