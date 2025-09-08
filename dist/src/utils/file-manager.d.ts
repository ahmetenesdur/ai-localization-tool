import type { LocaleData, FileOperationsConfig } from "../types";
/**
 * Options for file operations
 */
export interface FileManagerOptions {
    atomic?: boolean;
    createMissingDirs?: boolean;
    backupFiles?: boolean;
    backupDir?: string;
    encoding?: BufferEncoding;
    jsonIndent?: number;
    compact?: boolean;
    indent?: number;
}
/**
 * FileManager - Modern asynchronous file operations
 * This is the preferred class for all file operations.
 */
export declare class FileManager {
    /**
     * Default options for file operations
     */
    private static defaultOptions;
    private static options;
    /**
     * Configure global options for file operations
     */
    static configure(options: FileOperationsConfig | FileManagerOptions): void;
    /**
     * Get current configuration
     */
    static getConfig(): Required<FileManagerOptions>;
    /**
     * Find locale files in the specified directory
     */
    static findLocaleFiles(localesDir: string, sourceLang: string): Promise<string[]>;
    /**
     * Read JSON file asynchronously
     */
    static readJSON(filePath: string, options?: FileManagerOptions): Promise<LocaleData>;
    /**
     * Generate a unique temporary file path to prevent collisions
     */
    private static _generateTempFilePath;
    /**
     * Write data to JSON file asynchronously
     */
    static writeJSON(filePath: string, data: LocaleData, options?: FileManagerOptions): Promise<boolean>;
    /**
     * Ensure directory exists, create it if it doesn't
     */
    static ensureDir(dir: string): Promise<void>;
    /**
     * Scan for locale files with pattern matching
     */
    static scanLocaleFiles(localesDir: string, pattern?: RegExp): Promise<string[]>;
    /**
     * Get file modification time
     */
    static getModifiedTime(filePath: string): Promise<Date>;
    /**
     * Check if file exists
     */
    static exists(filePath: string): Promise<boolean>;
    /**
     * Delete file
     */
    static deleteFile(filePath: string, options?: FileManagerOptions): Promise<boolean>;
    /**
     * List files in a directory
     */
    static listFiles(dirPath: string, options?: FileManagerOptions): Promise<string[]>;
}
/**
 * SyncFileManager - Synchronous file operations
 * Used for backward compatibility. New code should use FileManager instead.
 * @deprecated Use the async FileManager for better performance
 * PERFORMANCE WARNING: This class blocks the event loop and should be avoided
 */
export declare class SyncFileManager {
    /**
     * Default options for file operations
     */
    private static defaultOptions;
    private static options;
    /**
     * Configure global options for file operations
     * @deprecated Use FileManager.configure() instead for non-blocking operations
     */
    static configure(options: FileManagerOptions): void;
    /**
     * Get current configuration
     * @deprecated Use FileManager.getConfig() instead
     */
    static getConfig(): Required<FileManagerOptions>;
    /**
     * Find locale files in the specified directory (sync)
     * @deprecated Use FileManager.findLocaleFiles() instead for non-blocking operations
     */
    static findLocaleFiles(localesDir: string, sourceLang: string): string[];
    /**
     * Read JSON file synchronously
     * @deprecated Use FileManager.readJSON() instead for non-blocking operations
     */
    static readJSON(filePath: string, options?: FileManagerOptions): LocaleData;
    /**
     * Write data to JSON file synchronously
     * @deprecated Use FileManager.writeJSON() instead for non-blocking operations
     */
    static writeJSON(filePath: string, data: LocaleData, options?: FileManagerOptions): boolean;
    /**
     * Check if file exists synchronously
     */
    static exists(filePath: string): boolean;
    /**
     * Delete file synchronously
     * @deprecated Use FileManager.deleteFile() instead for non-blocking operations
     */
    static deleteFile(filePath: string, options?: FileManagerOptions): boolean;
}
//# sourceMappingURL=file-manager.d.ts.map