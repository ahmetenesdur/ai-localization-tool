import * as path from "path";
import { FileManager } from "@/utils/file-manager";
import { Orchestrator } from "@/core/orchestrator";
import StateManager from "@/utils/state-manager";
import type { LocalizationConfig, TranslationResult, ContextData } from "@/types";

interface TranslationItem {
	key: string;
	text: string;
	targetLang: string;
	existingTranslation?: string;
	isModified?: boolean;
	isNew?: boolean;
}

interface LanguageStats {
	processed: number;
	added: number;
	skipped: number;
	failed: number;
	timeMs: number;
	error?: string;
}

interface GlobalStats {
	total: number;
	byCategory: Record<string, number>;
	details: Record<string, { totalConfidence: number; samples: number }>;
	totalTime: number;
	success: number;
	failed: number;
	skipped: number;
	languages: Record<string, LanguageStats>;
	startTime: string;
	endTime?: string;
	totalDuration?: number;
	error?: {
		message: string;
		time: string;
		stack?: string;
	};
}

interface ProcessLanguageResult {
	status: any | null;
	savedMessage?: string;
	error?: string;
}

interface ComparisonResult {
	newKeys: string[];
	modifiedKeys: string[];
	deletedKeys: string[];
}

interface TranslationOptions extends LocalizationConfig {
	targets: string[];
	forceUpdate?: boolean;
	debug?: boolean;
	progressOptions?: any;
}

// Add StateManager instance
let stateManager: StateManager | null = null;

// Console lock for preventing overlapping output
const consoleLock = {
	queue: [] as Array<() => void>,
	isLocked: false,

	async log(message: string): Promise<void> {
		return new Promise((resolve) => {
			const executeLog = () => {
				console.log(message);
				this.isLocked = false;
				resolve();
				this._processQueue();
			};

			if (this.isLocked) {
				this.queue.push(executeLog);
			} else {
				this.isLocked = true;
				executeLog();
			}
		});
	},

	_processQueue(): void {
		if (this.queue.length > 0 && !this.isLocked) {
			this.isLocked = true;
			const nextLog = this.queue.shift();
			if (nextLog) nextLog();
		}
	},
};

/**
 * Validate input parameters for translation process
 */
async function validateTranslationInputs(
	file: string,
	options: TranslationOptions
): Promise<string> {
	if (!file || typeof file !== "string") {
		throw new Error("File path must be a non-empty string");
	}

	if (!options || typeof options !== "object") {
		throw new Error("Options must be an object");
	}

	// Resolve and validate file path to prevent traversal
	const resolvedFile = path.resolve(file);
	const cwd = process.cwd();
	if (!resolvedFile.startsWith(cwd)) {
		throw new Error(
			`Source file '${file}' is outside working directory (resolved: ${resolvedFile})`
		);
	}

	return resolvedFile;
}

/**
 * Initialize global statistics structure
 */
function initializeGlobalStats(): GlobalStats {
	return {
		total: 0,
		byCategory: {},
		details: {},
		totalTime: 0,
		success: 0,
		failed: 0,
		skipped: 0,
		languages: {},
		startTime: new Date().toISOString(),
	};
}

/**
 * Process a single language translation
 */
async function processLanguage(
	targetLang: string,
	sourceFile: string,
	flattenedSource: Record<string, string>,
	orchestrator: Orchestrator,
	options: TranslationOptions,
	globalStats: GlobalStats,
	comparison: ComparisonResult
): Promise<ProcessLanguageResult> {
	const langStartTime = Date.now();

	try {
		if (!targetLang || typeof targetLang !== "string") {
			throw new Error("Invalid target language provided");
		}

		await consoleLock.log(`\n🌎 Starting translations for ${targetLang}`);
		let finalStatus = null;
		let savedMessage: string | undefined;

		// Initialize language stats
		globalStats.languages[targetLang] = {
			processed: 0,
			added: 0,
			skipped: 0,
			failed: 0,
			timeMs: 0,
		};

		// Create target file path
		const sourceDir = path.dirname(sourceFile);
		const targetPath = path.join(sourceDir, `${targetLang}.json`);

		// Read existing target file
		let targetContent: Record<string, any> = {};
		try {
			targetContent = await FileManager.readJSON(targetPath);
			if (!targetContent || typeof targetContent !== "object") {
				targetContent = {};
			}
		} catch (err) {
			const error = err as Error;
			if (error.message.includes("ENOENT")) {
				await consoleLock.log(`🆕 Creating new translation file for ${targetLang}`);
			}
			targetContent = {};
		}

		// Flatten target content
		let flattenedTarget: Record<string, string> = {};
		try {
			// TODO: Import ObjectTransformer when migrated
			const { ObjectTransformer } = require("../utils/object-transformer");
			flattenedTarget = ObjectTransformer.flatten(targetContent);
			if (!flattenedTarget || typeof flattenedTarget !== "object") {
				flattenedTarget = {};
			}
		} catch (err) {
			flattenedTarget = {};
		}

		// Find missing or outdated keys
		const missingKeys: TranslationItem[] = [];

		for (const [key, sourceText] of Object.entries(flattenedSource)) {
			globalStats.languages[targetLang].processed++;

			const isNewKey = comparison.newKeys.includes(key);
			const isModifiedKey = comparison.modifiedKeys.includes(key);
			const keyExistsInTarget = key in flattenedTarget;

			// Skip if key exists and not forcing update or modified
			if (keyExistsInTarget && !options.forceUpdate && !isModifiedKey) {
				globalStats.languages[targetLang].skipped++;
				globalStats.skipped++;
				continue;
			}

			missingKeys.push({
				key,
				text: sourceText,
				targetLang,
				existingTranslation: flattenedTarget[key],
				isModified: isModifiedKey,
				isNew: isNewKey,
			});
		}

		if (missingKeys.length === 0) {
			await consoleLock.log(`✅ All translations exist for ${targetLang}`);
			globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
			return { status: { completed: 0, total: 0, language: targetLang } };
		}

		await consoleLock.log(`Found ${missingKeys.length} missing translations for ${targetLang}`);

		// Process translations
		let results: TranslationResult[] = [];
		try {
			results = await orchestrator.processTranslations(missingKeys);
			if (!Array.isArray(results)) {
				results = [];
			}
		} catch (err) {
			const error = err as Error;
			console.error(`Error processing translations for ${targetLang}: ${error.message}`);
			results = [];
			globalStats.languages[targetLang].failed += missingKeys.length;
			globalStats.failed += missingKeys.length;
		}

		// Filter valid results
		const validResults = results.filter(
			(result) =>
				result &&
				result.success === true &&
				result.key &&
				typeof result.key === "string" &&
				result.translated &&
				typeof result.translated === "string"
		);

		if (validResults.length > 0) {
			// Update target content
			validResults.forEach(({ key, translated }) => {
				flattenedTarget[key] = translated;
			});

			// Save to file
			const { ObjectTransformer } = require("../utils/object-transformer");
			const unflattened = ObjectTransformer.unflatten(flattenedTarget);
			await FileManager.writeJSON(targetPath, unflattened);

			// Update statistics
			globalStats.total += validResults.length;
			globalStats.success += validResults.length;
			globalStats.failed += results.length - validResults.length;
			globalStats.languages[targetLang].added += validResults.length;
			globalStats.languages[targetLang].failed += results.length - validResults.length;

			// Update category stats
			validResults.forEach((result) => {
				if (result.context) {
					const category = result.context.category || "general";
					globalStats.byCategory[category] = (globalStats.byCategory[category] || 0) + 1;

					if (!globalStats.details[category]) {
						globalStats.details[category] = {
							totalConfidence: 0,
							samples: 0,
						};
					}

					globalStats.details[category].totalConfidence += result.context.confidence || 0;
					globalStats.details[category].samples++;
				}
			});

			savedMessage = `\n💾 Translations saved: ${targetLang}.json`;
		}

		globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
		return { status: finalStatus, savedMessage };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		await consoleLock.log(`\n❌ Error processing ${targetLang}: ${errorMessage}`);

		if (globalStats.languages[targetLang]) {
			globalStats.languages[targetLang].error = errorMessage;
			globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
		}

		return { status: null, error: errorMessage };
	}
}

/**
 * Main translator function
 */
export async function translateFile(
	file: string,
	options: TranslationOptions
): Promise<GlobalStats> {
	await consoleLock.log(`\nProcessing File: "${path.basename(file)}"`);

	try {
		const resolvedFile = await validateTranslationInputs(file, options);
		const startTime = Date.now();

		// Read source content
		const sourceContent = await FileManager.readJSON(resolvedFile);
		const { ObjectTransformer } = require("../utils/object-transformer");
		const flattenedSource = ObjectTransformer.flatten(sourceContent);
		const totalKeys = Object.keys(flattenedSource).length;

		await consoleLock.log(`Source file contains ${totalKeys} translation keys`);

		// Initialize statistics
		const globalStats = initializeGlobalStats();

		// Initialize StateManager if not already done
		if (!stateManager) {
			stateManager = new StateManager({
				stateDir: options.syncOptions?.stateDir || ".localize-cache",
				stateFileName: options.syncOptions?.stateFileName || "localization.state.json",
			});
		}

		// Load previous state and generate current state
		const previousState = await stateManager.loadState(process.cwd());
		const currentState = stateManager.generateStateFromSource(flattenedSource);

		// Compare states to find changes
		const comparison = stateManager.compareStates(previousState, currentState);

		// Save current state for next run
		try {
			await stateManager.saveState(process.cwd(), currentState);
			await consoleLock.log(`💾 Cache updated successfully`);
		} catch (saveError) {
			const errorMessage = saveError instanceof Error ? saveError.message : "Unknown error";
			await consoleLock.log(`⚠️  Warning: Failed to save cache state: ${errorMessage}`);
		}

		// Process all languages
		const languageConcurrency = options.concurrencyLimit || 3;
		const targetLanguages = [...options.targets];

		await consoleLock.log(
			`🚀 Processing ${targetLanguages.length} languages with concurrency of ${languageConcurrency}`
		);

		// Process languages in batches
		for (let i = 0; i < targetLanguages.length; i += languageConcurrency) {
			const currentBatch = targetLanguages.slice(i, i + languageConcurrency);

			const batchResults = await Promise.all(
				currentBatch.map((targetLang) =>
					processLanguage(
						targetLang,
						resolvedFile,
						flattenedSource,
						new Orchestrator({ ...options, concurrencyLimit: 1 }),
						options,
						globalStats,
						comparison
					)
				)
			);

			// Log results
			for (const result of batchResults) {
				if (result.savedMessage) {
					await consoleLock.log(result.savedMessage);
				}
			}
		}

		// Finalize
		globalStats.endTime = new Date().toISOString();
		globalStats.totalDuration = (Date.now() - startTime) / 1000;

		await displayGlobalSummary(globalStats, options.targets.length);

		return globalStats;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		await consoleLock.log(`\nTranslation error: ${errorMessage}`);
		throw error;
	}
}

/**
 * Display global summary
 */
async function displayGlobalSummary(stats: GlobalStats, totalLanguages: number): Promise<void> {
	await consoleLock.log("\n🌍 Global Translation Summary:");
	await consoleLock.log(`Languages Processed: ${totalLanguages}`);
	await consoleLock.log(`Total Translations: ${stats.total}`);
	await consoleLock.log(`✅ Success: ${stats.success}`);
	await consoleLock.log(`❌ Failed: ${stats.failed}`);
	await consoleLock.log(`⏭️ Skipped: ${stats.skipped}`);
	await consoleLock.log(`⏳ Total Time: ${stats.totalDuration?.toFixed(1)}s`);

	// Display language stats
	await consoleLock.log("\n📊 Per-language Performance:");
	for (const [lang, langStats] of Object.entries(stats.languages)) {
		const timeSeconds = langStats.timeMs / 1000;
		await consoleLock.log(
			`${lang}: ${langStats.added} added, ${langStats.skipped} skipped, ${langStats.failed} failed (${timeSeconds.toFixed(1)}s)`
		);
	}

	await consoleLock.log(
		`\nAll operations completed successfully in ${stats.totalDuration?.toFixed(1)}s`
	);
}

/**
 * Find locale files
 */
export async function findLocaleFiles(localesDir: string, sourceLang: string): Promise<string[]> {
	try {
		return await FileManager.findLocaleFiles(localesDir, sourceLang);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		await consoleLock.log(`Error finding locale files: ${errorMessage}`);
		return [];
	}
}

/**
 * Validate and fix existing translations (simplified version)
 */
export async function validateAndFixExistingTranslations(
	file: string,
	options: TranslationOptions
): Promise<void> {
	await consoleLock.log(`\nChecking existing translations in: "${path.basename(file)}"`);
	// TODO: Implement when quality checker is migrated
	await consoleLock.log("Feature will be available after quality checker migration");
}
