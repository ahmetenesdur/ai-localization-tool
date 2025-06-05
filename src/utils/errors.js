/**
 * Custom Error Classes - Standardized error handling
 * Provides consistent error types with enhanced debugging information
 */

const CONSTANTS = require("./constants");

/**
 * Base class for all localization tool errors
 */
class LocalizationError extends Error {
	constructor(message, code = null, context = {}) {
		super(message);
		this.name = this.constructor.name;
		this.code = code || `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}GENERIC`;
		this.context = context;
		this.timestamp = new Date().toISOString();
		this.stack = this.stack;

		// Truncate message if too long
		if (this.message.length > CONSTANTS.ERRORS.MAX_ERROR_MESSAGE_LENGTH) {
			this.message =
				this.message.substring(0, CONSTANTS.ERRORS.MAX_ERROR_MESSAGE_LENGTH) + "...";
		}

		// Capture additional context
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Convert error to JSON for logging/serialization
	 */
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
			timestamp: this.timestamp,
			stack: this.stack,
		};
	}

	/**
	 * Get sanitized error for user display (removes stack trace)
	 */
	getUserMessage() {
		return {
			type: this.name,
			message: this.message,
			code: this.code,
			timestamp: this.timestamp,
		};
	}
}

/**
 * Configuration related errors
 */
class ConfigurationError extends LocalizationError {
	constructor(message, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}CONFIG`, context);
	}
}

/**
 * Validation errors
 */
class ValidationError extends LocalizationError {
	constructor(message, field = null, value = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}VALIDATION`, {
			field,
			value:
				typeof value === "string" && value.length > CONSTANTS.ERRORS.ERROR_TRUNCATE_LENGTH
					? value.substring(0, CONSTANTS.ERRORS.ERROR_TRUNCATE_LENGTH) + "..."
					: value,
			...context,
		});
		this.field = field;
		this.value = value;
	}
}

/**
 * API Provider related errors
 */
class ProviderError extends LocalizationError {
	constructor(message, provider = null, operation = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}PROVIDER`, {
			provider,
			operation,
			...context,
		});
		this.provider = provider;
		this.operation = operation;
	}
}

/**
 * Rate limiting errors
 */
class RateLimitError extends LocalizationError {
	constructor(message, provider = null, retryAfter = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}RATE_LIMIT`, {
			provider,
			retryAfter,
			...context,
		});
		this.provider = provider;
		this.retryAfter = retryAfter;
	}
}

/**
 * Translation specific errors
 */
class TranslationError extends LocalizationError {
	constructor(message, sourceLang = null, targetLang = null, textPreview = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}TRANSLATION`, {
			sourceLang,
			targetLang,
			textPreview:
				textPreview && textPreview.length > CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH
					? textPreview.substring(0, CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH) + "..."
					: textPreview,
			...context,
		});
		this.sourceLang = sourceLang;
		this.targetLang = targetLang;
		this.textPreview = textPreview;
	}
}

/**
 * File operation errors
 */
class FileOperationError extends LocalizationError {
	constructor(message, filePath = null, operation = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}FILE_OP`, {
			filePath,
			operation,
			...context,
		});
		this.filePath = filePath;
		this.operation = operation;
	}
}

/**
 * Cache related errors
 */
class CacheError extends LocalizationError {
	constructor(message, cacheType = null, key = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}CACHE`, {
			cacheType,
			key:
				key && key.length > CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH
					? key.substring(0, CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH) + "..."
					: key,
			...context,
		});
		this.cacheType = cacheType;
		this.key = key;
	}
}

/**
 * Context analysis errors
 */
class ContextAnalysisError extends LocalizationError {
	constructor(message, textPreview = null, analysisType = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}CONTEXT`, {
			textPreview:
				textPreview && textPreview.length > CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH
					? textPreview.substring(0, CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH) + "..."
					: textPreview,
			analysisType,
			...context,
		});
		this.textPreview = textPreview;
		this.analysisType = analysisType;
	}
}

/**
 * Network/Connection errors
 */
class NetworkError extends LocalizationError {
	constructor(message, endpoint = null, statusCode = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}NETWORK`, {
			endpoint,
			statusCode,
			...context,
		});
		this.endpoint = endpoint;
		this.statusCode = statusCode;
	}
}

/**
 * Timeout errors
 */
class TimeoutError extends LocalizationError {
	constructor(message, operation = null, timeoutMs = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}TIMEOUT`, {
			operation,
			timeoutMs,
			...context,
		});
		this.operation = operation;
		this.timeoutMs = timeoutMs;
	}
}

/**
 * Security related errors
 */
class SecurityError extends LocalizationError {
	constructor(message, violationType = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}SECURITY`, {
			violationType,
			...context,
		});
		this.violationType = violationType;
	}
}

/**
 * Resource exhaustion errors (memory, disk, etc.)
 */
class ResourceError extends LocalizationError {
	constructor(message, resourceType = null, context = {}) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}RESOURCE`, {
			resourceType,
			...context,
		});
		this.resourceType = resourceType;
	}
}

/**
 * Quality check failures
 */
class QualityError extends LocalizationError {
	constructor(
		message,
		checkType = null,
		originalText = null,
		translatedText = null,
		context = {}
	) {
		super(message, `${CONSTANTS.ERRORS.ERROR_CODE_PREFIX}QUALITY`, {
			checkType,
			originalPreview:
				originalText && originalText.length > CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH
					? originalText.substring(0, CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH) + "..."
					: originalText,
			translatedPreview:
				translatedText && translatedText.length > CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH
					? translatedText.substring(0, CONSTANTS.ERRORS.PREVIEW_TRUNCATE_LENGTH) + "..."
					: translatedText,
			...context,
		});
		this.checkType = checkType;
		this.originalText = originalText;
		this.translatedText = translatedText;
	}
}

/**
 * Error factory for creating appropriate error types
 */
class ErrorFactory {
	/**
	 * Create error from axios/http error
	 */
	static fromHttpError(error, context = {}) {
		if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
			return new NetworkError(
				`Connection failed: ${error.message}`,
				error.config?.url,
				null,
				{ originalError: error.code, ...context }
			);
		}

		if (error.response) {
			const statusCode = error.response.status;
			const endpoint = error.config?.url;

			if (statusCode === CONSTANTS.HTTP_STATUS.TOO_MANY_REQUESTS) {
				const retryAfter = error.response.headers["retry-after"];
				return new RateLimitError(
					`Rate limit exceeded: ${error.response.statusText}`,
					context.provider,
					retryAfter,
					{ statusCode, endpoint, ...context }
				);
			}

			if (statusCode >= CONSTANTS.HTTP_STATUS.SERVER_ERROR_MIN) {
				return new ProviderError(
					`Server error: ${error.response.statusText}`,
					context.provider,
					context.operation,
					{ statusCode, endpoint, ...context }
				);
			}

			if (
				statusCode === CONSTANTS.HTTP_STATUS.UNAUTHORIZED ||
				statusCode === CONSTANTS.HTTP_STATUS.FORBIDDEN
			) {
				return new SecurityError(
					`Authentication failed: ${error.response.statusText}`,
					"authentication",
					{ statusCode, endpoint, ...context }
				);
			}

			return new NetworkError(
				`HTTP error: ${error.response.statusText}`,
				endpoint,
				statusCode,
				context
			);
		}

		if (error.code === "ECONNABORTED") {
			return new TimeoutError(
				`Request timeout: ${error.message}`,
				context.operation,
				error.timeout,
				context
			);
		}

		return new NetworkError(`Network error: ${error.message}`, null, null, context);
	}

	/**
	 * Create error from file operation
	 */
	static fromFileError(error, filePath, operation, context = {}) {
		if (error.code === "ENOENT") {
			return new FileOperationError(`File not found: ${filePath}`, filePath, operation, {
				originalError: error.code,
				...context,
			});
		}

		if (error.code === "EACCES" || error.code === "EPERM") {
			return new SecurityError(`Permission denied: ${filePath}`, "file_access", {
				filePath,
				operation,
				originalError: error.code,
				...context,
			});
		}

		if (error.code === "ENOSPC") {
			return new ResourceError(`Insufficient disk space: ${filePath}`, "disk_space", {
				filePath,
				operation,
				originalError: error.code,
				...context,
			});
		}

		return new FileOperationError(
			`File operation failed: ${error.message}`,
			filePath,
			operation,
			{ originalError: error.code, ...context }
		);
	}

	/**
	 * Create error from validation failure
	 */
	static fromValidation(message, field, value, context = {}) {
		return new ValidationError(message, field, value, context);
	}

	/**
	 * Create generic error with context
	 */
	static create(message, context = {}) {
		return new LocalizationError(message, null, context);
	}
}

/**
 * Error utilities
 */
class ErrorUtils {
	/**
	 * Check if error is retryable
	 */
	static isRetryable(error) {
		if (error instanceof RateLimitError) return true;
		if (error instanceof TimeoutError) return true;
		if (
			error instanceof NetworkError &&
			error.statusCode >= CONSTANTS.HTTP_STATUS.SERVER_ERROR_MIN
		)
			return true;
		if (
			error instanceof ProviderError &&
			error.statusCode >= CONSTANTS.HTTP_STATUS.SERVER_ERROR_MIN
		)
			return true;

		return false;
	}

	/**
	 * Check if error is critical (should stop processing)
	 */
	static isCritical(error) {
		if (error instanceof SecurityError) return true;
		if (error instanceof ConfigurationError) return true;
		if (error instanceof ResourceError) return true;

		return false;
	}

	/**
	 * Get retry delay for retryable errors
	 */
	static getRetryDelay(error, attempt = 1) {
		if (error instanceof RateLimitError && error.retryAfter) {
			return parseInt(error.retryAfter) * CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS; // Convert to ms
		}

		// Exponential backoff with jitter
		const baseDelay =
			CONSTANTS.ERRORS.RETRY_EXPONENTIAL_BASE ** attempt *
			CONSTANTS.PROVIDERS.DEFAULT_RETRY_DELAY;
		const jitter = baseDelay * CONSTANTS.ERRORS.RETRY_JITTER_FACTOR * Math.random();

		return Math.min(baseDelay + jitter, CONSTANTS.PROVIDERS.MAX_RETRY_DELAY);
	}

	/**
	 * Sanitize error for logging (remove sensitive data)
	 */
	static sanitizeForLogging(error) {
		const sanitized = { ...error };

		// Remove or mask sensitive fields
		CONSTANTS.SECURITY.SENSITIVE_FIELDS.forEach((field) => {
			if (sanitized[field]) {
				sanitized[field] = CONSTANTS.SECURITY.SANITIZED_REPLACEMENT;
			}
			if (sanitized.context && sanitized.context[field]) {
				sanitized.context[field] = CONSTANTS.SECURITY.SANITIZED_REPLACEMENT;
			}
		});

		// Truncate stack trace for cleaner logs
		if (sanitized.stack && sanitized.stack.length > CONSTANTS.ERRORS.STACK_TRUNCATE_LENGTH) {
			sanitized.stack =
				sanitized.stack.substring(0, CONSTANTS.ERRORS.STACK_TRUNCATE_LENGTH) +
				"\n... [truncated]";
		}

		return sanitized;
	}
}

module.exports = {
	// Base errors
	LocalizationError,

	// Specific error types
	ConfigurationError,
	ValidationError,
	ProviderError,
	RateLimitError,
	TranslationError,
	FileOperationError,
	CacheError,
	ContextAnalysisError,
	NetworkError,
	TimeoutError,
	SecurityError,
	ResourceError,
	QualityError,

	// Utilities
	ErrorFactory,
	ErrorUtils,
};
