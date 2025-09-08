const path = require("path");
const { FileManager } = require("../utils/file-manager");
const ObjectTransformer = require("../utils/object-transformer");
const Orchestrator = require("../core/orchestrator");
const QualityChecker = require("../utils/quality");
const StateManager = require("../utils/state-manager");
// FIXED: Removed unused 'os' import
// SECURITY FIX: Add input validation
const InputValidator = require("../utils/input-validator");
const gracefulShutdown = require("../utils/graceful-shutdown");

// Prevents overlapping console output
const consoleLock = {
	queue: [],
	isLocked: false,

	async log(message) {
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

	_processQueue() {
		if (this.queue.length > 0 && !this.isLocked) {
			this.isLocked = true;
			const nextLog = this.queue.shift();
			nextLog();
		}
	},
};

/**
 * REFACTORED: Validate input parameters for translation process
 */
async function validateTranslationInputs(file, options) {
	if (!file || typeof file !== "string") {
		throw new Error("File path must be a non-empty string");
	}

	if (!options || typeof options !== "object") {
		throw new Error("Options must be an object");
	}

	// Validate source language
	if (options.source) {
		options.source = InputValidator.validateLanguageCode(options.source, "source language");
	}

	// Validate target languages
	if (options.targets && Array.isArray(options.targets)) {
		options.targets = InputValidator.validateLanguageCodes(options.targets, "target languages");
	}

	// Validate locales directory if provided
	if (options.localesDir) {
		options.localesDir = InputValidator.validateDirectoryPath(
			options.localesDir,
			"locales directory"
		);
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
 * REFACTORED: Initialize translation state and sync analysis
 */
async function initializeTranslationState(resolvedFile, flattenedSource, options) {
	const stateManager = new StateManager();
	const projectRoot = process.cwd();

	// Load previous state and generate current state
	const previousState = await stateManager.loadState(projectRoot);
	const currentState = stateManager.generateStateFromSource(flattenedSource);

	// Compare states to find changes
	const comparison = stateManager.compareStates(previousState, currentState);
	const stats = stateManager.getComparisonStats(comparison);

	// Log sync information if there are changes
	if (stats.hasChanges) {
		await consoleLock.log(`\n🔄 Sync Analysis:`);
		await consoleLock.log(`   📝 New keys: ${stats.newCount}`);
		await consoleLock.log(`   ✏️  Modified keys: ${stats.modifiedCount}`);
		await consoleLock.log(`   🗑️ Deleted keys: ${stats.deletedCount}`);

		// Handle deleted keys - remove them from all target files
		const syncEnabled = options.syncOptions?.enabled !== false;
		const removeDeletedEnabled = options.syncOptions?.removeDeletedKeys !== false;

		// FIXED: Enhanced null safety for comparison results
		if (
			comparison?.deletedKeys &&
			Array.isArray(comparison.deletedKeys) &&
			comparison.deletedKeys.length > 0 &&
			syncEnabled &&
			removeDeletedEnabled
		) {
			await consoleLock.log(
				`\n🗑️ Removing ${comparison.deletedKeys.length} deleted keys from target files...`
			);
			await removeDeletedKeysFromTargets(resolvedFile, comparison.deletedKeys, options);
		}
	} else if (
		previousState &&
		typeof previousState === "object" &&
		Object.keys(previousState).length > 0
	) {
		await consoleLock.log(`✅ No changes detected in source file`);
	} else {
		await consoleLock.log(`🎉 First run - will process all keys`);
	}

	return { stateManager, projectRoot, currentState, comparison };
}

/**
 * REFACTORED: Initialize global statistics structure
 */
function initializeGlobalStats() {
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
 * REFACTORED: Process all target languages with improved concurrency
 */
async function processAllLanguages(
	resolvedFile,
	flattenedSource,
	options,
	globalStats,
	comparison
) {
	// Use concurrency limit from options
	const languageConcurrency = options.concurrencyLimit || 3;
	const targetLanguages = [...options.targets];

	await consoleLock.log(
		`🚀 Processing ${targetLanguages.length} languages with concurrency of ${languageConcurrency}`
	);

	// Process languages in batches
	for (let i = 0; i < targetLanguages.length; i += languageConcurrency) {
		const currentBatch = targetLanguages.slice(i, i + languageConcurrency);
		const progressOptions = { logToConsole: false };

		// Process batch of languages in parallel
		const batchResults = await Promise.all(
			currentBatch.map((targetLang) =>
				processLanguage(
					targetLang,
					resolvedFile,
					flattenedSource,
					new Orchestrator({ ...options, concurrencyLimit: 1, progressOptions }),
					{ ...options, progressOptions },
					globalStats,
					comparison
				)
			)
		);

		// Log results for completed batch
		await logBatchResults(batchResults);

		// Add line break between batches
		if (i + languageConcurrency < targetLanguages.length) {
			await consoleLock.log("");
		}
	}
}

/**
 * REFACTORED: Log results for a batch of language processing
 */
async function logBatchResults(batchResults) {
	for (const result of batchResults) {
		if (result && result.status && result.status.completed > 0) {
			const status = result.status;
			const percent = (status.completed / status.total) * 100;
			const width = 20;
			const filledWidth = Math.max(0, Math.round((status.completed / status.total) * width));
			const emptyWidth = Math.max(0, width - filledWidth);
			const progressBar = `[${"=".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;

			const percentText = `${percent.toFixed(1)}%`.padStart(6);
			const itemsText = `${status.completed}/${status.total}`.padEnd(10);
			const successText = `✅ ${status.success}`.padEnd(8);
			const failedText = `❌ ${status.failed}`.padEnd(8);
			const langInfo = status.language ? `[${status.language}] ` : "";

			await consoleLock.log(
				`${langInfo}${progressBar} ${percentText} | ${itemsText}items | ${successText}| ${failedText}`
			);

			// Log summary
			await consoleLock.log(`\n📊 Translation Summary:`);
			await consoleLock.log(`🗣️ Language: ${status.language || "Unknown"}`);
			await consoleLock.log(`🔢 Total Items: ${status.total}`);
			await consoleLock.log(
				`✅ Successful: ${status.success} (${((status.success / (status.total || 1)) * 100).toFixed(1)}%)`
			);
			await consoleLock.log(`❌ Failed: ${status.failed}`);
		}

		if (result && result.savedMessage) {
			await consoleLock.log(result.savedMessage);
		}
	}
}

/**
 * REFACTORED: Finalize translation process and save state
 */
async function finalizeTranslation(
	stateManager,
	projectRoot,
	currentState,
	globalStats,
	startTime,
	options
) {
	// Calculate final metrics
	globalStats.endTime = new Date().toISOString();
	globalStats.totalDuration = (Date.now() - startTime) / 1000;

	// Display final summary
	await displayGlobalSummary(globalStats, options.targets.length);

	// Save current state for future sync operations
	try {
		await stateManager.saveState(projectRoot, currentState);
		if (options.debug) {
			await consoleLock.log(`💾 State saved for future sync operations`);
		}
	} catch (error) {
		await consoleLock.log(`⚠️ Warning: Could not save state: ${error.message}`);
	}
}

/**
 * Main translator function to process a source file and create translations
 * for all target languages. Enhanced with better performance and error handling.
 * SECURITY FIX: Added input validation to prevent path traversal and injection attacks
 */
async function translateFile(file, options) {
	await consoleLock.log(`\nProcessing File: "${path.basename(file)}"`);

	try {
		let resolvedFile = await validateTranslationInputs(file, options);

		// Read source content
		const startTime = Date.now();
		const sourceContent = await FileManager.readJSON(resolvedFile);
		const flattenedSource = ObjectTransformer.flatten(sourceContent);
		const totalKeys = Object.keys(flattenedSource).length;

		await consoleLock.log(`Source file contains ${totalKeys} translation keys`);

		// Initialize translation state and sync analysis
		const { stateManager, projectRoot, currentState, comparison } =
			await initializeTranslationState(resolvedFile, flattenedSource, options);

		// Register shutdown callback to save state before exit
		gracefulShutdown.registerCallback(async () => {
			try {
				await stateManager.saveState(projectRoot, currentState);
				console.log("State saved during shutdown");
			} catch (error) {
				console.error("Failed to save state during shutdown:", error.message);
			}
		});

		// Initialize global statistics structure
		const globalStats = initializeGlobalStats();

		try {
			// Process all target languages using the refactored helper function
			await processAllLanguages(
				resolvedFile,
				flattenedSource,
				options,
				globalStats,
				comparison
			);

			// Finalize translation process and save state
			await finalizeTranslation(
				stateManager,
				projectRoot,
				currentState,
				globalStats,
				startTime,
				options
			);

			return globalStats;
		} catch (error) {
			await consoleLock.log(`\nTranslation error: ${error.message}`);

			// Add error information to stats
			globalStats.error = {
				message: error.message,
				time: new Date().toISOString(),
				stack: process.env.DEBUG ? error.stack : undefined,
			};

			throw error;
		} finally {
			// Save cache stats if debug is enabled
			if (process.env.DEBUG) {
				await consoleLock.log("\nCache statistics:");
				// Note: This will only show cache stats for the *last* orchestrator instance used in the loop.
				// A more robust solution would involve aggregating stats from all instances.
				// For now, we log the globalStats which contain aggregated success/fail counts.
			}
		}
	} catch (validationError) {
		await consoleLock.log(`\nInput validation error: ${validationError.message}`);
		throw validationError;
	}
}

/**
 * Process a single language translation
 * SECURITY FIX: Added input validation to prevent path traversal attacks
 */
async function processLanguage(
	targetLang,
	sourceFile,
	flattenedSource,
	orchestrator, // Now gets a fresh instance per language
	options,
	globalStats, // Used for aggregating final stats
	comparison // Comparison results for sync functionality
) {
	const langStartTime = Date.now();

	// FIXED: Enhanced error boundary with comprehensive validation
	try {
		// FIXED: Input validation error boundary
		if (!targetLang || typeof targetLang !== "string") {
			throw new Error("Invalid target language provided");
		}
		if (!sourceFile || typeof sourceFile !== "string") {
			throw new Error("Invalid source file path provided");
		}
		if (!flattenedSource || typeof flattenedSource !== "object") {
			throw new Error("Invalid flattened source data provided");
		}
		if (!orchestrator || typeof orchestrator.processTranslations !== "function") {
			throw new Error("Invalid orchestrator instance provided");
		}
		if (!globalStats || typeof globalStats !== "object") {
			throw new Error("Invalid global stats object provided");
		}
		// SECURITY FIX: Validate target language before processing
		const safeTargetLang = InputValidator.validateLanguageCode(targetLang, "target language");

		await consoleLock.log(`\n\ud83c\udf0e Starting translations for ${safeTargetLang}`);
		let finalStatus = null;
		let savedMessage = null;

		// Initialize language stats in globalStats
		globalStats.languages[safeTargetLang] = {
			processed: 0,
			added: 0,
			skipped: 0,
			failed: 0,
			timeMs: 0,
		};

		// SECURITY FIX: Create safe target file path to prevent path traversal
		const sourceDir = path.dirname(sourceFile);
		const safeTargetFilename = `${safeTargetLang}.json`;
		const targetPath = InputValidator.createSafeFilePath(sourceDir, safeTargetFilename);

		// FIXED: Enhanced error boundary for file operations
		let targetContent = {};
		try {
			targetContent = await FileManager.readJSON(targetPath);

			// FIXED: Validate read content
			if (!targetContent || typeof targetContent !== "object") {
				console.warn(`Invalid content in ${targetPath}, using empty object`);
				targetContent = {};
			}
		} catch (err) {
			// FIXED: More specific error handling
			if (err.code === "ENOENT") {
				await consoleLock.log(
					`\ud83c\udd95 Creating new translation file for ${safeTargetLang}`
				);
			} else {
				console.warn(`Error reading ${targetPath}: ${err.message}, using empty object`);
			}
			targetContent = {};
		}

		// FIXED: Safe object transformation with error boundary
		let flattenedTarget = {};
		try {
			flattenedTarget = ObjectTransformer.flatten(targetContent);
			if (!flattenedTarget || typeof flattenedTarget !== "object") {
				flattenedTarget = {};
			}
		} catch (err) {
			console.warn(`Error flattening target content: ${err.message}, using empty object`);
			flattenedTarget = {};
		}

		// Find missing or outdated keys
		const missingKeys = [];

		for (const [key, sourceText] of Object.entries(flattenedSource)) {
			// SECURITY FIX: Validate translation key
			try {
				InputValidator.validateKey(key, "translation key");
				InputValidator.validateText(sourceText, "source text");
			} catch (keyError) {
				await consoleLock.log(
					`\u26a0\ufe0f Skipping invalid key/text: ${keyError.message}`
				);
				globalStats.languages[safeTargetLang].failed++;
				globalStats.failed++;
				continue;
			}

			// Track what we're processing for this language in globalStats
			globalStats.languages[safeTargetLang].processed++;

			// Determine if this key needs translation/re-translation
			const isNewKey = comparison.newKeys.includes(key);
			const isModifiedKey = comparison.modifiedKeys.includes(key);
			const keyExistsInTarget = key in flattenedTarget;

			// Skip if key exists in target and we're not forcing update,
			// AND it's not a modified key that needs re-translation
			if (keyExistsInTarget && !options.forceUpdate && !isModifiedKey) {
				globalStats.languages[safeTargetLang].skipped++;
				globalStats.skipped++;
				continue;
			}

			// Add to processing list (includes new keys, modified keys, and force updates)
			missingKeys.push({
				key,
				text: sourceText,
				targetLang: safeTargetLang,
				existingTranslation: flattenedTarget[key],
				isModified: isModifiedKey,
				isNew: isNewKey,
			});
		}

		if (missingKeys.length === 0) {
			await consoleLock.log(`✅ All translations exist for ${safeTargetLang}`);
			globalStats.languages[safeTargetLang].timeMs = Date.now() - langStartTime;
			return { status: { completed: 0, total: 0, language: safeTargetLang } }; // Return minimal status
		}

		await consoleLock.log(
			`Found ${missingKeys.length} missing translations for ${safeTargetLang}`
		);

		// FIXED: Enhanced error boundary for translation processing
		let results = [];
		try {
			results = await orchestrator.processTranslations(missingKeys);

			// FIXED: Validate results structure
			if (!Array.isArray(results)) {
				console.warn("Invalid results from orchestrator, using empty array");
				results = [];
			}
		} catch (err) {
			console.error(`Error processing translations for ${safeTargetLang}: ${err.message}`);
			results = [];
			// Update global stats for failed processing
			if (globalStats.languages[safeTargetLang]) {
				globalStats.languages[safeTargetLang].failed += missingKeys.length;
				globalStats.failed += missingKeys.length;
			}
		}

		// FIXED: Safe status capture with error boundary
		try {
			if (orchestrator?.progress && typeof orchestrator.progress.getStatus === "function") {
				finalStatus = orchestrator.progress.getStatus();
			}
		} catch (err) {
			console.warn(`Error getting orchestrator status: ${err.message}`);
		}

		// FIXED: Safe results filtering with error boundary
		let validResults = [];
		try {
			validResults = results.filter((result) => result && result.success === true);

			// FIXED: Additional validation of valid results
			validResults = validResults.filter(
				(result) =>
					result.key &&
					typeof result.key === "string" &&
					result.translated &&
					typeof result.translated === "string"
			);
		} catch (err) {
			console.warn(`Error filtering results: ${err.message}`);
			validResults = [];
		}

		if (validResults.length > 0) {
			validResults.forEach(({ key, translated }) => {
				flattenedTarget[key] = translated;
			});

			// Save to file
			const unflattened = ObjectTransformer.unflatten(flattenedTarget);
			await FileManager.writeJSON(targetPath, unflattened);

			// Aggregate statistics into globalStats
			globalStats.total += validResults.length;
			globalStats.success += validResults.length;
			globalStats.failed += results.length - validResults.length;
			globalStats.languages[safeTargetLang].added += validResults.length;
			globalStats.languages[safeTargetLang].failed += results.length - validResults.length;

			// Update total time (consider aggregating this differently if needed)
			// const orchestratorTime = parseFloat(orchestrator.progress.statistics.totalTime || 0);
			// globalStats.totalTime += orchestratorTime; // This might overestimate total time if run in parallel

			// Update category stats if context data exists
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

			savedMessage = `\n\ud83d\udcbe Translations saved: ${safeTargetLang}.json`;
		}

		// Update language timing in globalStats
		globalStats.languages[safeTargetLang].timeMs = Date.now() - langStartTime;
		return { status: finalStatus, savedMessage }; // Return status and save message
	} catch (error) {
		// SECURITY FIX: Sanitize error messages to prevent information leakage
		const safeError = error.message.includes("outside working directory")
			? "Invalid file path detected"
			: error.message;

		// Log error but continue with other languages
		await consoleLock.log(`\n\u274c Error processing ${targetLang}: ${safeError}`);
		if (globalStats.languages[targetLang]) {
			globalStats.languages[targetLang].error = safeError;
			globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
		}
		return { status: null, error: safeError }; // Return error info
	}
}

/**
 * Validate and fix existing translations that have length issues
 */
async function validateAndFixExistingTranslations(file, options) {
	await consoleLock.log(`\nChecking existing translations in: "${path.basename(file)}"`);

	const sourceContent = await FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);
	const orchestrator = new Orchestrator(options);

	const languageResults = await Promise.all(
		options.targets.map(async (targetLang) => {
			try {
				const targetPath = path.join(path.dirname(file), `${targetLang}.json`);
				const targetContent = await FileManager.readJSON(targetPath);
				return { targetLang, targetPath, content: targetContent, success: true };
			} catch (err) {
				await consoleLock.log(`Could not read ${targetLang}.json: ${err.message}`);
				return { targetLang, success: false, error: err.message };
			}
		})
	);

	const validLanguages = languageResults.filter((result) => result.success);

	try {
		let totalFixed = 0;
		let totalIssues = 0;

		const qualityChecker = new QualityChecker({
			styleGuide: options.styleGuide,
			context: options.context,
			lengthControl: options.lengthControl,
			rules: {
				lengthValidation: true,
				placeholderConsistency: false,
				htmlTagsConsistency: false,
				punctuationCheck: false,
			},
		});

		// Process languages sequentially to avoid overwhelming the API
		for (const langData of validLanguages) {
			const { targetLang, targetPath, content } = langData;
			const flattenedTarget = ObjectTransformer.flatten(content);
			const invalidItems = [];

			for (const [key, translatedText] of Object.entries(flattenedTarget)) {
				const sourceText = flattenedSource[key];
				if (!sourceText) continue;

				const checkResult = qualityChecker.validate(sourceText, translatedText, {
					...options,
					targetLang,
				});

				const lengthIssue = checkResult.issues.find((i) => i.type === "length");

				if (lengthIssue) {
					invalidItems.push({
						key,
						text: sourceText,
						targetLang,
						existingTranslation: translatedText,
						issueDetails: lengthIssue,
					});
				}
			}

			if (invalidItems.length > 0) {
				totalIssues += invalidItems.length;
				await consoleLock.log(
					`Found ${invalidItems.length} length issues in ${targetLang}`
				);

				// Batch process fixes to improve performance
				const results = await orchestrator.processTranslations(invalidItems);

				const fixedCount = results.filter((r) => r.success).length;
				totalFixed += fixedCount;

				results.forEach(({ key, translated, success }) => {
					if (success && translated) {
						flattenedTarget[key] = translated;
					}
				});

				const unflattened = ObjectTransformer.unflatten(flattenedTarget);
				await FileManager.writeJSON(targetPath, unflattened);

				await consoleLock.log(
					`Fixed ${fixedCount}/${invalidItems.length} translations in ${targetLang}`
				);
			} else {
				await consoleLock.log(`No length issues found in ${targetLang}`);
			}
		}

		if (totalIssues > 0) {
			await consoleLock.log(
				`\nFix Length Summary: Fixed ${totalFixed} of ${totalIssues} issues (${Math.round((totalFixed / totalIssues) * 100)}%)`
			);
		} else {
			await consoleLock.log(`\nNo length issues found in any language`);
		}
	} catch (error) {
		await consoleLock.log(`\nValidation error: ${error.message}`);
		throw error;
	}
}

/**
 * Display a summary of the translation results
 */
async function displayGlobalSummary(stats, totalLanguages) {
	await consoleLock.log("\n\ud83c\udf0d Global Translation Summary:");
	await consoleLock.log(`Languages Processed: ${totalLanguages}`);
	await consoleLock.log(`Total Translations: ${stats.total}`);
	await consoleLock.log(`\u2705 Success: ${stats.success}`);
	await consoleLock.log(`\u274c Failed: ${stats.failed}`);
	await consoleLock.log(`\u23ed\ufe0f Skipped: ${stats.skipped}`);
	await consoleLock.log(`\u23f3 Total Time: ${stats.totalTime.toFixed(1)}s`);
	await consoleLock.log(
		`\u26a1 Average per language: ${(stats.totalTime / totalLanguages).toFixed(1)}s`
	);

	// Display detailed language stats
	await consoleLock.log("\n\ud83d\udcca Per-language Performance:");
	for (const [lang, langStats] of Object.entries(stats.languages)) {
		const timeSeconds = langStats.timeMs / 1000;
		await consoleLock.log(
			`${lang}: ${langStats.added} added, ${langStats.skipped} skipped, ${langStats.failed} failed (${timeSeconds.toFixed(1)}s)`
		);
	}

	// Only show categories if we have them
	if (Object.keys(stats.byCategory).length > 0) {
		await consoleLock.log("\n\ud83d\udcca Context Analysis by Category:");
		for (const [category, count] of Object.entries(stats.byCategory)) {
			const details = stats.details[category];
			if (details && details.samples > 0) {
				const avgConfidence = details.totalConfidence / details.samples;
				const confidenceStr = `${(avgConfidence * 100).toFixed(1)}%`;
				await consoleLock.log(
					`${category}: ${count} items (${confidenceStr} avg confidence)`
				);
			} else {
				await consoleLock.log(`${category}: ${count} items`);
			}
		}
	}

	// Add a clear completion message - just once
	await consoleLock.log(
		`\nAll operations completed successfully in ${stats.totalDuration.toFixed(1)}s`
	);

	// Exit the process with success code after a short delay
	// The delay ensures any buffered console output is flushed
	setTimeout(() => {
		process.exit(0);
	}, 500);
}

/**
 * Find locale files based on source language
 */
async function findLocaleFiles(localesDir, sourceLang) {
	try {
		return await FileManager.findLocaleFiles(localesDir, sourceLang);
	} catch (error) {
		await consoleLock.log(`Error finding locale files: ${error.message}`);
		return [];
	}
}

/**
 * Remove deleted keys from all target language files
 * @param {string} sourceFile - Path to source file
 * @param {string[]} deletedKeys - Array of keys to remove
 * @param {Object} options - Configuration options
 */
async function removeDeletedKeysFromTargets(sourceFile, deletedKeys, options) {
	const sourceDir = path.dirname(sourceFile);
	let totalRemoved = 0;
	let filesProcessed = 0;

	for (const targetLang of options.targets) {
		try {
			// SECURITY FIX: Create safe target file path
			const safeTargetFilename = `${targetLang}.json`;
			const targetPath = InputValidator.createSafeFilePath(sourceDir, safeTargetFilename);

			// Check if target file exists
			const fileExists = await FileManager.exists(targetPath);
			if (!fileExists) {
				await consoleLock.log(`   Skipping ${targetLang}.json (file doesn't exist)`);
				continue;
			}

			// Read target file
			const targetContent = await FileManager.readJSON(targetPath);
			const flattenedTarget = ObjectTransformer.flatten(targetContent);

			// Remove deleted keys
			let removedFromThisFile = 0;
			for (const key of deletedKeys) {
				if (key in flattenedTarget) {
					delete flattenedTarget[key];
					removedFromThisFile++;
					totalRemoved++;
				}
			}

			// Save updated file only if we removed something
			if (removedFromThisFile > 0) {
				const unflattened = ObjectTransformer.unflatten(flattenedTarget);
				await FileManager.writeJSON(targetPath, unflattened);
				await consoleLock.log(
					`   ✅ ${targetLang}.json: Removed ${removedFromThisFile} keys`
				);
			} else {
				await consoleLock.log(`   No keys to remove from ${targetLang}.json`);
			}

			filesProcessed++;
		} catch (error) {
			await consoleLock.log(
				`   \u274c Error processing ${targetLang}.json: ${error.message}`
			);
		}
	}

	await consoleLock.log(
		`Cleanup Summary: Removed ${totalRemoved} keys from ${filesProcessed} files\n`
	);
}

module.exports = {
	findLocaleFiles,
	translateFile,
	validateAndFixExistingTranslations,
};
