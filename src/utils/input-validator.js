/**
 * Input validation utility for security and data integrity
 */

const path = require("path");

class InputValidator {
	static LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/;
	static VALID_PROVIDERS = ["dashscope", "xai", "openai", "deepseek", "gemini"];
	static MAX_TEXT_LENGTH = 10000;
	static MAX_KEY_LENGTH = 500;
	static MAX_PATH_LENGTH = 1000;
	static MAX_CONFIG_DEPTH = 10;

	static DANGEROUS_PATTERNS = [
		/\.\.\//g,
		/\0/g,
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		/javascript:/gi,
		/data:.*base64/gi,
	];

	/**
	 * Validate and sanitize language code
	 */
	static validateLanguageCode(langCode, paramName = "language") {
		if (!langCode || typeof langCode !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

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
	 */
	static validateDirectoryPath(dirPath, paramName = "directory") {
		if (!dirPath || typeof dirPath !== "string") {
			throw new Error(`${paramName} must be a non-empty string`);
		}

		const resolved = path.resolve(dirPath);

		const cwd = process.cwd();

		if (!resolved.startsWith(cwd)) {
			throw new Error(
				`${paramName} path '${dirPath}' is outside working directory (resolved: ${resolved})`
			);
		}

		return resolved;
	}

	/**
	 * Validate translation text
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

		if (key.includes("../") || key.includes("..\\")) {
			throw new Error(`${paramName} contains path traversal sequences: '${key}'`);
		}

		return key;
	}

	/**
	 * Validate API provider name
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
	 */
	static sanitizeFilename(filename, extension = null) {
		if (!filename || typeof filename !== "string") {
			throw new Error("Filename must be a non-empty string");
		}

		let sanitized = path
			.basename(filename)
			.replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
			.replace(/^\.+/, "")
			.trim();

		if (!sanitized) {
			throw new Error(`Filename '${filename}' results in empty name after sanitization`);
		}

		if (extension && !sanitized.endsWith(extension)) {
			sanitized = sanitized.replace(/\.[^.]*$/, "") + extension;
		}

		return sanitized;
	}

	/**
	 * Create safe file path within a directory
	 */
	static createSafeFilePath(baseDir, filename) {
		const safeFilename = this.sanitizeFilename(filename);
		const fullPath = path.join(baseDir, safeFilename);

		const resolved = path.resolve(fullPath);
		const resolvedBase = path.resolve(baseDir);

		if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
			throw new Error(`Generated path '${fullPath}' is outside base directory '${baseDir}'`);
		}

		return fullPath;
	}

	/**
	 * Validate configuration object
	 */
	static validateConfig(config) {
		if (!config || typeof config !== "object") {
			throw new Error("Configuration must be an object");
		}

		const validated = { ...config };

		if (validated.source) {
			validated.source = this.validateLanguageCode(validated.source, "source language");
		}

		if (validated.targets) {
			validated.targets = this.validateLanguageCodes(validated.targets, "target languages");
		}

		if (validated.localesDir) {
			validated.localesDir = this.validateDirectoryPath(
				validated.localesDir,
				"locales directory"
			);
		}

		if (validated.apiProvider) {
			validated.apiProvider = this.validateProvider(validated.apiProvider, "API provider");
		}

		return validated;
	}

	/**
	 * Sanitize translation text for security
	 */
	static sanitizeTranslationText(text) {
		if (!text || typeof text !== "string") {
			return text;
		}

		let sanitized = text;

		for (const pattern of this.DANGEROUS_PATTERNS) {
			sanitized = sanitized.replace(pattern, "");
		}

		sanitized = sanitized
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim();

		return sanitized;
	}

	/**
	 * Validate API key format
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

		const lowercaseKey = apiKey.toLowerCase();
		const invalidPatterns = ["test", "placeholder", "example", "your-api-key", "sk-test"];

		for (const pattern of invalidPatterns) {
			if (lowercaseKey.includes(pattern)) {
				throw new Error(`${providerName} API key appears to be a placeholder`);
			}
		}

		return true;
	}

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

		for (const [k] of this._requestCounts) {
			const [, keyMinute] = k.split("-");
			if (parseInt(keyMinute) < minute - 5) {
				this._requestCounts.delete(k);
			}
		}

		return true;
	}
}

module.exports = InputValidator;
