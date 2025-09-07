import { promises as fs } from "fs";
import * as fsSync from "fs";
import * as path from "path";
import type { LocaleData, FileOperationsConfig } from "@/types";

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
export class FileManager {
	/**
	 * Default options for file operations
	 */
	private static defaultOptions: Required<FileManagerOptions> = {
		atomic: true,
		createMissingDirs: true,
		backupFiles: true,
		backupDir: "./backups",
		encoding: "utf8" as BufferEncoding,
		jsonIndent: 4,
		compact: false,
		indent: 4,
	};

	private static options: Required<FileManagerOptions> = { ...FileManager.defaultOptions };

	/**
	 * Configure global options for file operations
	 */
	static configure(options: FileOperationsConfig | FileManagerOptions): void {
		if (!options) return;

		this.options = {
			...this.defaultOptions,
			...options,
			encoding: (options.encoding || this.defaultOptions.encoding) as BufferEncoding,
		};
	}

	/**
	 * Get current configuration
	 */
	static getConfig(): Required<FileManagerOptions> {
		return this.options;
	}

	/**
	 * Find locale files in the specified directory
	 */
	static async findLocaleFiles(localesDir: string, sourceLang: string): Promise<string[]> {
		try {
			const sourceFile = path.join(localesDir, `${sourceLang}.json`);

			// Check if source file exists
			await fs.access(sourceFile);
			return [sourceFile];
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`Source language file not found: ${errorMessage}`);
		}
	}

	/**
	 * Read JSON file asynchronously
	 */
	static async readJSON(filePath: string, options: FileManagerOptions = {}): Promise<LocaleData> {
		const config = { ...this.getConfig(), ...options };

		try {
			const content = await fs.readFile(filePath, config.encoding);
			return JSON.parse(content) as LocaleData;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File read error (${filePath}): ${errorMessage}`);
		}
	}

	/**
	 * Generate a unique temporary file path to prevent collisions
	 */
	private static _generateTempFilePath(filePath: string): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `${filePath}.tmp.${timestamp}.${random}`;
	}

	/**
	 * Write data to JSON file asynchronously
	 */
	static async writeJSON(
		filePath: string,
		data: LocaleData,
		options: FileManagerOptions = {}
	): Promise<boolean> {
		const config = { ...this.getConfig(), ...options };

		try {
			// Create target directory if it doesn't exist
			const dir = path.dirname(filePath);
			if (config.createMissingDirs) {
				await this.ensureDir(dir);
			}

			// Create backup directory if needed
			if (config.backupFiles) {
				await this.ensureDir(config.backupDir);
			}

			// Create backup of existing file if it exists and backups are enabled
			if (config.backupFiles) {
				try {
					await fs.access(filePath);
					const backupPath = path.join(
						config.backupDir,
						`${path.basename(filePath)}.${Date.now()}.bak`
					);
					await fs.copyFile(filePath, backupPath);
				} catch (err) {
					// File doesn't exist, no need to backup
				}
			}

			// Format JSON with optional formatting
			const jsonString = JSON.stringify(
				data,
				null,
				config.compact ? 0 : options.indent || config.jsonIndent
			);

			// Use atomic write if configured
			if (config.atomic) {
				const tempFile = this._generateTempFilePath(filePath);
				let tempFileCreated = false;

				try {
					// Write to temporary file first
					await fs.writeFile(tempFile, jsonString, config.encoding);
					tempFileCreated = true;

					// Atomically replace the target file
					await fs.rename(tempFile, filePath);

					// Success - temp file has been renamed, no cleanup needed
					tempFileCreated = false;
				} catch (renameError) {
					if (tempFileCreated) {
						try {
							await fs.unlink(tempFile);
						} catch (cleanupError) {
							// Log cleanup failure but don't throw - original error is more important
							const cleanupMessage =
								cleanupError instanceof Error
									? cleanupError.message
									: "Unknown error";
							console.warn(
								`Warning: Failed to clean up temporary file ${tempFile}: ${cleanupMessage}`
							);
						}
					}

					// Re-throw the original error with better context
					const errorMessage =
						renameError instanceof Error ? renameError.message : "Unknown error";
					throw new Error(
						`Atomic write failed during rename operation (${filePath}): ${errorMessage}. ` +
							`Temp file cleanup ${tempFileCreated ? "attempted" : "not needed"}.`
					);
				}
			} else {
				// Direct write
				await fs.writeFile(filePath, jsonString, config.encoding);
			}

			return true;
		} catch (err) {
			const operation = config.atomic ? "atomic write" : "direct write";
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File ${operation} error (${filePath}): ${errorMessage}`);
		}
	}

	/**
	 * Ensure directory exists, create it if it doesn't
	 */
	static async ensureDir(dir: string): Promise<void> {
		try {
			await fs.mkdir(dir, { recursive: true });
		} catch (err) {
			const error = err as NodeJS.ErrnoException;
			if (error.code !== "EEXIST") {
				throw err;
			}
		}
	}

	/**
	 * Scan for locale files with pattern matching
	 */
	static async scanLocaleFiles(
		localesDir: string,
		pattern: RegExp = /\.json$/
	): Promise<string[]> {
		try {
			const files = await fs.readdir(localesDir);
			return files
				.filter((file) => pattern.test(file))
				.map((file) => path.join(localesDir, file));
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`Error scanning locale directory: ${errorMessage}`);
		}
	}

	/**
	 * Get file modification time
	 */
	static async getModifiedTime(filePath: string): Promise<Date> {
		try {
			const stats = await fs.stat(filePath);
			return stats.mtime;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`Error getting file stats: ${errorMessage}`);
		}
	}

	/**
	 * Check if file exists
	 */
	static async exists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Delete file
	 */
	static async deleteFile(filePath: string, options: FileManagerOptions = {}): Promise<boolean> {
		const config = { ...this.getConfig(), ...options };

		try {
			// Create backup before deletion if backups are enabled
			if (config.backupFiles) {
				try {
					await fs.access(filePath);
					await this.ensureDir(config.backupDir);
					const backupPath = path.join(
						config.backupDir,
						`${path.basename(filePath)}.deleted.${Date.now()}.bak`
					);
					await fs.copyFile(filePath, backupPath);
				} catch (err) {
					// File doesn't exist or other error, can't backup
				}
			}

			await fs.unlink(filePath);
			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File deletion error (${filePath}): ${errorMessage}`);
		}
	}

	/**
	 * List files in a directory
	 */
	static async listFiles(dirPath: string, options: FileManagerOptions = {}): Promise<string[]> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			const files = entries
				.filter((entry) => entry.isFile())
				.map((entry) => path.join(dirPath, entry.name));

			return files;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`Directory read error (${dirPath}): ${errorMessage}`);
		}
	}
}

/**
 * SyncFileManager - Synchronous file operations
 * Used for backward compatibility. New code should use FileManager instead.
 * @deprecated Use the async FileManager for better performance
 * PERFORMANCE WARNING: This class blocks the event loop and should be avoided
 */
export class SyncFileManager {
	/**
	 * Default options for file operations
	 */
	private static defaultOptions: Required<FileManagerOptions> = {
		atomic: false, // Atomic operations not supported in sync mode
		createMissingDirs: true,
		backupFiles: true,
		backupDir: "./backups",
		encoding: "utf8" as BufferEncoding,
		jsonIndent: 4,
		compact: false,
		indent: 4,
	};

	private static options: Required<FileManagerOptions> = { ...SyncFileManager.defaultOptions };

	/**
	 * Configure global options for file operations
	 * @deprecated Use FileManager.configure() instead for non-blocking operations
	 */
	static configure(options: FileManagerOptions): void {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager is deprecated. Use async FileManager for better performance."
		);

		if (!options) return;

		this.options = {
			...this.defaultOptions,
			...options,
			atomic: false, // Always false for sync operations
		};
	}

	/**
	 * Get current configuration
	 * @deprecated Use FileManager.getConfig() instead
	 */
	static getConfig(): Required<FileManagerOptions> {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager is deprecated. Use async FileManager for better performance."
		);
		return this.options;
	}

	/**
	 * Find locale files in the specified directory (sync)
	 * @deprecated Use FileManager.findLocaleFiles() instead for non-blocking operations
	 */
	static findLocaleFiles(localesDir: string, sourceLang: string): string[] {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager.findLocaleFiles() is deprecated. Use async FileManager.findLocaleFiles() for better performance."
		);

		const sourceFile = path.join(localesDir, `${sourceLang}.json`);

		if (!fsSync.existsSync(sourceFile)) {
			throw new Error(`Source language file not found: ${sourceFile}`);
		}

		return [sourceFile];
	}

	/**
	 * Read JSON file synchronously
	 * @deprecated Use FileManager.readJSON() instead for non-blocking operations
	 */
	static readJSON(filePath: string, options: FileManagerOptions = {}): LocaleData {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager.readJSON() is deprecated. Use async FileManager.readJSON() for better performance."
		);

		const config = { ...this.getConfig(), ...options };

		try {
			const content = fsSync.readFileSync(filePath, config.encoding);
			return JSON.parse(content) as LocaleData;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File read error (${filePath}): ${errorMessage}`);
		}
	}

	/**
	 * Write data to JSON file synchronously
	 * @deprecated Use FileManager.writeJSON() instead for non-blocking operations
	 */
	static writeJSON(
		filePath: string,
		data: LocaleData,
		options: FileManagerOptions = {}
	): boolean {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager.writeJSON() is deprecated. Use async FileManager.writeJSON() for better performance."
		);

		const config = { ...this.getConfig(), ...options };

		try {
			// Create target directory if it doesn't exist
			const dir = path.dirname(filePath);
			if (config.createMissingDirs && !fsSync.existsSync(dir)) {
				fsSync.mkdirSync(dir, { recursive: true });
			}

			// Create backup directory if needed
			if (config.backupFiles && !fsSync.existsSync(config.backupDir)) {
				fsSync.mkdirSync(config.backupDir, { recursive: true });
			}

			// Create backup of existing file if it exists and backups are enabled
			if (config.backupFiles && fsSync.existsSync(filePath)) {
				const backupPath = path.join(
					config.backupDir,
					`${path.basename(filePath)}.${Date.now()}.bak`
				);
				fsSync.copyFileSync(filePath, backupPath);
			}

			// Format JSON with optional formatting
			const jsonString = JSON.stringify(
				data,
				null,
				config.compact ? 0 : options.indent || config.jsonIndent
			);

			// Write file
			fsSync.writeFileSync(filePath, jsonString, config.encoding);
			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File write error (${filePath}): ${errorMessage}`);
		}
	}

	/**
	 * Check if file exists synchronously
	 */
	static exists(filePath: string): boolean {
		return fsSync.existsSync(filePath);
	}

	/**
	 * Delete file synchronously
	 * @deprecated Use FileManager.deleteFile() instead for non-blocking operations
	 */
	static deleteFile(filePath: string, options: FileManagerOptions = {}): boolean {
		console.warn(
			"⚠️ DEPRECATION WARNING: SyncFileManager.deleteFile() is deprecated. Use async FileManager.deleteFile() for better performance."
		);

		const config = { ...this.getConfig(), ...options };

		try {
			// Create backup before deletion if backups are enabled
			if (config.backupFiles && fsSync.existsSync(filePath)) {
				if (!fsSync.existsSync(config.backupDir)) {
					fsSync.mkdirSync(config.backupDir, { recursive: true });
				}

				const backupPath = path.join(
					config.backupDir,
					`${path.basename(filePath)}.deleted.${Date.now()}.bak`
				);
				fsSync.copyFileSync(filePath, backupPath);
			}

			fsSync.unlinkSync(filePath);
			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			throw new Error(`File deletion error (${filePath}): ${errorMessage}`);
		}
	}
}
