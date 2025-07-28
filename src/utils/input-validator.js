/**
 * Input Validator - Security-focused input validation utility
 * Prevents path traversal, validates language codes, and sanitizes inputs
 */

const path = require("path");

class InputValidator {
	/**
	 * Valid language code pattern (ISO 639-1 and common extensions)
	 * FIXED: Pattern updated to handle lowercase input after sanitization
	 */
	static LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/;

	/**
	 * Valid provider names
	 */
	static VALID_PROVIDERS = ["dashscope", "xai", "openai", "deepseek", "gemini"];

	/**
	 * ENHANCED: Security limits to prevent DoS and resource exhaustion
	 */
	static MAX_TEXT_LENGTH = 10000; // Reduced from 50KB to 10KB for better performance
	static MAX_KEY_LENGTH = 500; // Reduced from 1000 to 500 characters
	static MAX_PATH_LENGTH = 1000; // Maximum file path length
	static MAX_CONFIG_DEPTH = 10; // Maximum object nesting depth

	/**
	 * ENHANCED: Dangerous patterns that should be blocked
	 */
	static DANGEROUS_PATTERNS = [
		/\.\.\//g, // Path traversal
		/\0/g, // Null bytes
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Control characters
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
		/javascript:/gi, // JavaScript protocol
		/data:.*base64/gi, // Base64 data URLs (potential XSS)
	];

	/**
	 * Validate and sanitize language code
	 * @param {string} langCode - Language code to validate
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string} - Sanitized language code
	 * @throws {Error} - If invalid
	 */
	static validateLanguageCode(langCode, paramName = "language") {
		if (!langCode || typeof langCode !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

		// Trim and lowercase
		const sanitized = langCode.trim().toLowerCase();

		if (sanitized.length === 0) {
			throw new Error(`${paramName} cannot be empty after trimming`);
		}

		if (sanitized.length > 10) {
			throw new Error(`${paramName} code too long: '${langCode}' (max 10 characters)`);
		}

		if (sanitized.includes("..") || sanitized.includes("/") || sanitized.includes("\\")) {
			throw new Error(`${paramName} code contains forbidden characters: '${langCode}'`);
		}

		if (!this.LANGUAGE_CODE_PATTERN.test(sanitized)) {
			throw new Error(
				`Invalid ${paramName} code: '${langCode}'. Must match pattern: ${this.LANGUAGE_CODE_PATTERN}`
			);
		}

		return sanitized;
	}

	/**
	 * Validate array of language codes
	 * @param {string[]} langCodes - Array of language codes
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string[]} - Array of sanitized language codes
	 */
	static validateLanguageCodes(langCodes, paramName = "languages") {
		if (!Array.isArray(langCodes)) {
			throw new Error(`${paramName} must be an array`);
		}

		if (langCodes.length === 0) {
			throw new Error(`${paramName} array cannot be empty`);
		}

		if (langCodes.length > 50) {
			throw new Error(`${paramName} array too large (max 50 languages)`);
		}

		return langCodes.map((code, index) =>
			this.validateLanguageCode(code, `${paramName}[${index}]`)
		);
	}

	/**
	 * Validate and sanitize directory path
	 * @param {string} dirPath - Directory path to validate
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string} - Sanitized directory path
	 */
	static validateDirectoryPath(dirPath, paramName = "directory") {
		if (!dirPath || typeof dirPath !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

		// Resolve to absolute path to prevent traversal
		const resolved = path.resolve(dirPath);

		// Get the current working directory
		const cwd = process.cwd();

		// Ensure the resolved path is within or equal to CWD
		if (!resolved.startsWith(cwd)) {
			throw new Error(
				`${paramName} path '${dirPath}' is outside working directory (resolved: ${resolved})`
			);
		}

		return resolved;
	}

	/**
	 * Validate translation text
	 * @param {string} text - Text to validate
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string} - Validated text
	 */
	static validateText(text, paramName = "text") {
		if (text === null || text === undefined) {
			throw new Error(`${paramName} cannot be null or undefined`);
		}

		if (typeof text !== "string") {
			throw new Error(`${paramName} must be a string`);
		}

		if (text.length > this.MAX_TEXT_LENGTH) {
			throw new Error(
				`${paramName} too long (${text.length} chars, max ${this.MAX_TEXT_LENGTH})`
			);
		}

		return text;
	}

	/**
	 * Validate translation key
	 * @param {string} key - Key to validate
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string} - Validated key
	 */
	static validateKey(key, paramName = "key") {
		if (!key || typeof key !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

		if (key.length > this.MAX_KEY_LENGTH) {
			throw new Error(
				`${paramName} too long (${key.length} chars, max ${this.MAX_KEY_LENGTH})`
			);
		}

		// Check for potentially dangerous characters
		if (key.includes("../") || key.includes("..\\")) {
			throw new Error(`${paramName} contains path traversal sequences: '${key}'`);
		}

		return key;
	}

	/**
	 * Validate API provider name
	 * @param {string} provider - Provider name to validate
	 * @param {string} paramName - Parameter name for error messages
	 * @returns {string} - Validated provider name
	 */
	static validateProvider(provider, paramName = "provider") {
		if (!provider || typeof provider !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

		const normalized = provider.toLowerCase().trim();

		if (!this.VALID_PROVIDERS.includes(normalized)) {
			throw new Error(
				`Invalid ${paramName}: '${provider}'. Valid providers: ${this.VALID_PROVIDERS.join(", ")}`
			);
		}

		return normalized;
	}

	/**
	 * Sanitize filename to prevent path traversal
	 * @param {string} filename - Filename to sanitize
	 * @param {string} extension - Expected file extension (optional)
	 * @returns {string} - Safe filename
	 */
	static sanitizeFilename(filename, extension = null) {
		if (!filename || typeof filename !== "string") {
			throw new Error("Filename must be a non-empty string");
		}

		// Remove path components and dangerous characters
		let sanitized = path
			.basename(filename)
			.replace(/[<>:"/\\|?*\x00-\x1f]/g, "") // Remove illegal filename chars
			.replace(/^\.+/, "") // Remove leading dots
			.trim();

		if (!sanitized) {
			throw new Error(`Filename '${filename}' results in empty name after sanitization`);
		}

		// Validate extension if provided
		if (extension && !sanitized.endsWith(extension)) {
			sanitized = sanitized.replace(/\.[^.]*$/, "") + extension;
		}

		return sanitized;
	}

	/**
	 * Create safe file path within a directory
	 * @param {string} baseDir - Base directory (should be pre-validated)
	 * @param {string} filename - Filename to join
	 * @returns {string} - Safe file path
	 */
	static createSafeFilePath(baseDir, filename) {
		const safeFilename = this.sanitizeFilename(filename);
		const fullPath = path.join(baseDir, safeFilename);

		// Ensure the result is still within baseDir
		const resolved = path.resolve(fullPath);
		const resolvedBase = path.resolve(baseDir);

		if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
			throw new Error(`Generated path '${fullPath}' is outside base directory '${baseDir}'`);
		}

		return fullPath;
	}

	/**
	 * Validate configuration object
	 * @param {Object} config - Configuration to validate
	 * @returns {Object} - Validated configuration
	 */
	static validateConfig(config) {
		if (!config || typeof config !== "object") {
			throw new Error("Configuration must be an object");
		}

		const validated = { ...config };

		// Validate source language
		if (validated.source) {
			validated.source = this.validateLanguageCode(validated.source, "source language");
		}

		// Validate target languages
		if (validated.targets) {
			validated.targets = this.validateLanguageCodes(validated.targets, "target languages");
		}

		// Validate locales directory
		if (validated.localesDir) {
			validated.localesDir = this.validateDirectoryPath(
				validated.localesDir,
				"locales directory"
			);
		}

		// Validate API provider
		if (validated.apiProvider) {
			validated.apiProvider = this.validateProvider(validated.apiProvider, "API provider");
		}

		return validated;
	}

	/**
	 * ENHANCED: Sanitize translation text for security
	 */
	static sanitizeTranslationText(text) {
		if (!text || typeof text !== "string") {
			return text;
		}

		let sanitized = text;

		// Remove dangerous patterns
		for (const pattern of this.DANGEROUS_PATTERNS) {
			sanitized = sanitized.replace(pattern, "");
		}

		// Normalize whitespace but preserve structure
		sanitized = sanitized
			.replace(/\r\n/g, "\n") // Normalize line endings
			.replace(/\r/g, "\n") // Convert remaining \r to \n
			.replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
			.trim();

		return sanitized;
	}

	/**
	 * ENHANCED: Validate API key format (basic validation without exposing key)
	 */
	static validateApiKeyFormat(apiKey, providerName) {
		if (!apiKey || typeof apiKey !== "string") {
			throw new Error(`${providerName} API key must be a non-empty string`);
		}

		if (apiKey.length < 10) {
			throw new Error(`${providerName} API key appears too short`);
		}

		if (apiKey.length > 200) {
			throw new Error(`${providerName} API key appears too long`);
		}

		// Check for obvious test/placeholder values
		const lowercaseKey = apiKey.toLowerCase();
		const invalidPatterns = ["test", "placeholder", "example", "your-api-key", "sk-test"];

		for (const pattern of invalidPatterns) {
			if (lowercaseKey.includes(pattern)) {
				throw new Error(`${providerName} API key appears to be a placeholder`);
			}
		}

		return true;
	}

	/**
	 * ENHANCED: Validate configuration object depth to prevent DoS
	 */
	static validateObjectDepth(obj, maxDepth = this.MAX_CONFIG_DEPTH, currentDepth = 0) {
		if (currentDepth > maxDepth) {
			throw new Error(`Configuration object too deeply nested (max depth: ${maxDepth})`);
		}

		if (obj && typeof obj === "object" && !Array.isArray(obj)) {
			for (const value of Object.values(obj)) {
				if (value && typeof value === "object") {
					this.validateObjectDepth(value, maxDepth, currentDepth + 1);
				}
			}
		}

		return true;
	}

	/**
	 * ENHANCED: Rate limiting validation for user inputs
	 */
	static validateRequestRate(identifier, maxRequestsPerMinute = 60) {
		const now = Date.now();
		const minute = Math.floor(now / 60000);

		if (!this._requestCounts) {
			this._requestCounts = new Map();
		}

		const key = `${identifier}-${minute}`;
		const currentCount = this._requestCounts.get(key) || 0;

		if (currentCount >= maxRequestsPerMinute) {
			throw new Error(`Too many requests from ${identifier}. Please try again later.`);
		}

		this._requestCounts.set(key, currentCount + 1);

		// Cleanup old entries
		for (const [k] of this._requestCounts) {
			const [, keyMinute] = k.split("-");
			if (parseInt(keyMinute) < minute - 5) {
				// Keep last 5 minutes
				this._requestCounts.delete(k);
			}
		}

		return true;
	}
}

module.exports = InputValidator;
