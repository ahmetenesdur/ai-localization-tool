/**
 * Input Validator - Security-focused input validation utility
 * Prevents path traversal, validates language codes, and sanitizes inputs
 */
/**
 * Input validator utility for security-focused validation
 */
export declare class InputValidator {
    /**
     * Valid language code pattern (ISO 639-1 and common extensions)
     * FIXED: Pattern updated to handle lowercase input after sanitization
     */
    static LANGUAGE_CODE_PATTERN: RegExp;
    /**
     * Valid provider names
     */
    static VALID_PROVIDERS: string[];
    /**
     * ENHANCED: Security limits to prevent DoS and resource exhaustion
     */
    static MAX_TEXT_LENGTH: number;
    static MAX_KEY_LENGTH: number;
    static MAX_PATH_LENGTH: number;
    static MAX_CONFIG_DEPTH: number;
    /**
     * ENHANCED: Dangerous patterns that should be blocked
     */
    static DANGEROUS_PATTERNS: RegExp[];
    /**
     * Validate and sanitize language code
     * @param langCode - Language code to validate
     * @param paramName - Parameter name for error messages
     * @returns Sanitized language code
     * @throws Error - If invalid
     */
    static validateLanguageCode(langCode: string, paramName?: string): string;
    /**
     * Validate array of language codes
     * @param langCodes - Array of language codes
     * @param paramName - Parameter name for error messages
     * @returns Array of sanitized language codes
     */
    static validateLanguageCodes(langCodes: string[], paramName?: string): string[];
    /**
     * Validate and sanitize directory path
     * @param dirPath - Directory path to validate
     * @param paramName - Parameter name for error messages
     * @returns Sanitized directory path
     */
    static validateDirectoryPath(dirPath: string, paramName?: string): string;
    /**
     * Validate translation text
     * @param text - Text to validate
     * @param paramName - Parameter name for error messages
     * @returns Validated text
     */
    static validateText(text: string, paramName?: string): string;
    /**
     * Validate translation key
     * @param key - Key to validate
     * @param paramName - Parameter name for error messages
     * @returns Validated key
     */
    static validateKey(key: string, paramName?: string): string;
    /**
     * Validate API provider name
     * @param provider - Provider name to validate
     * @param paramName - Parameter name for error messages
     * @returns Validated provider name
     */
    static validateProvider(provider: string, paramName?: string): string;
    /**
     * Sanitize filename to prevent path traversal
     * @param filename - Filename to sanitize
     * @param extension - Expected file extension (optional)
     * @returns Safe filename
     */
    static sanitizeFilename(filename: string, extension?: string | null): string;
    /**
     * Create safe file path within a directory
     * @param baseDir - Base directory (should be pre-validated)
     * @param filename - Filename to join
     * @returns Safe file path
     */
    static createSafeFilePath(baseDir: string, filename: string): string;
    /**
     * Validate configuration object
     * @param config - Configuration to validate
     * @returns Validated configuration
     */
    static validateConfig(config: Record<string, any>): Record<string, any>;
    /**
     * ENHANCED: Sanitize translation text for security
     */
    static sanitizeTranslationText(text: string): string;
    /**
     * ENHANCED: Validate API key format (basic validation without exposing key)
     */
    static validateApiKeyFormat(apiKey: string, providerName: string): boolean;
    /**
     * ENHANCED: Validate configuration object depth to prevent DoS
     */
    static validateObjectDepth(obj: Record<string, any>, maxDepth?: number, currentDepth?: number): boolean;
    /**
     * ENHANCED: Rate limiting validation for user inputs
     */
    static validateRequestRate(identifier: string, maxRequestsPerMinute?: number): boolean;
}
export default InputValidator;
//# sourceMappingURL=input-validator.d.ts.map