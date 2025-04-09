const path = require("path");
const { FileManager } = require("../utils/file-manager");
const ObjectTransformer = require("../utils/object-transformer");
const Orchestrator = require("../core/orchestrator");
const QualityChecker = require("../utils/quality");
const os = require("os");

// Add a simple console lock to prevent overlapping console output
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
 * Main translator function to process a source file and create translations
 * for all target languages. Enhanced with better performance and error handling.
 */
async function translateFile(file, options) {
	await consoleLock.log(`\n📄 Processing File: "${path.basename(file)}"`);

	// Read source content
	const startTime = Date.now();
	const sourceContent = await FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);
	const totalKeys = Object.keys(flattenedSource).length;

	await consoleLock.log(`📖 Source file contains ${totalKeys} translation keys`);

	// Global stats for all languages
	const globalStats = {
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

	const orchestrator = new Orchestrator(options);

	try {
		// Get CPU cores for concurrency limit
		const cpuCount = os.cpus().length;
		// Use half of CPU cores for parallel language processing, min 2, max 8
		const languageConcurrency = Math.max(2, Math.min(8, Math.floor(cpuCount / 2)));

		// Process target languages in batches based on available resources
		const targetLanguages = [...options.targets]; // Create a copy to avoid modifying the original

		await consoleLock.log(
			`🚀 Processing ${targetLanguages.length} languages with concurrency of ${languageConcurrency}`
		);

		// Process languages in batches
		for (let i = 0; i < targetLanguages.length; i += languageConcurrency) {
			const currentBatch = targetLanguages.slice(i, i + languageConcurrency);

			// Configure ProgressTracker for each language to prevent console overlap
			const progressOptions = { logToConsole: false }; // Disable automatic console output

			// Process batch of languages in parallel and collect results
			const batchResults = await Promise.all(
				currentBatch.map((targetLang) =>
					processLanguage(
						targetLang,
						file,
						flattenedSource,
						// Use a separate orchestrator instance for each language in the batch
						// to avoid progress tracker state conflicts
						new Orchestrator({ ...options, progressOptions }),
						{
							...options,
							progressOptions, // Pass options for progress tracker
						},
						globalStats // Pass globalStats for aggregation
					)
				)
			);

			// Log the final status for each language in the completed batch sequentially
			for (const result of batchResults) {
				if (result && result.status && result.status.completed > 0) {
					const status = result.status;
					// Create a progress bar similar to ProgressTracker._logProgress but using consoleLock
					const percent = (status.completed / status.total) * 100;
					const width = 20;
					const filledWidth = Math.max(
						0,
						Math.round((status.completed / status.total) * width)
					);
					const emptyWidth = Math.max(0, width - filledWidth);
					const progressBar = `[${"=".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;

					const percentText = `${percent.toFixed(1)}%`.padStart(6);
					const itemsText = `${status.completed}/${status.total}`.padEnd(10);
					const successText = `✅ ${status.success}`.padEnd(8);
					const failedText = `❌ ${status.failed}`.padEnd(8);

					const langInfo = status.language ? `[${status.language}] ` : "";

					await consoleLock.log(
						`${langInfo}${progressBar} ${percentText} | ${itemsText}items | ` +
							`${successText}| ${failedText}`
					);

					// Log the summary for completed operations
					await consoleLock.log(`\n📊 Translation Summary:`);
					await consoleLock.log(`🔤 Language: ${status.language || "Unknown"}`);
					await consoleLock.log(`🔢 Total Items: ${status.total}`);
					await consoleLock.log(
						`✅ Successful: ${status.success} (${((status.success / (status.total || 1)) * 100).toFixed(1)}%)`
					); // Avoid division by zero
					await consoleLock.log(`❌ Failed: ${status.failed}`);
				}
				// Log the saved message if it exists in the result
				if (result && result.savedMessage) {
					await consoleLock.log(result.savedMessage);
				}
			}

			// Add a line break between batches
			if (i + languageConcurrency < targetLanguages.length) {
				await consoleLock.log(""); // Empty line between language batches
			}
		}

		// Calculate final metrics
		globalStats.endTime = new Date().toISOString();
		globalStats.totalDuration = (Date.now() - startTime) / 1000;

		// Display final summary
		await displayGlobalSummary(globalStats, options.targets.length);

		return globalStats;
	} catch (error) {
		await consoleLock.log(`\n❌ Translation error: ${error.message}`);

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
			await consoleLock.log("\n📊 Cache statistics:");
			// Note: This will only show cache stats for the *last* orchestrator instance used in the loop.
			// A more robust solution would involve aggregating stats from all instances.
			// For now, we log the globalStats which contain aggregated success/fail counts.
			// await consoleLock.log(JSON.stringify(orchestrator.getCacheStats(), null, 2));
		}
	}
}

/**
 * Process a single language translation
 */
async function processLanguage(
	targetLang,
	sourceFile,
	flattenedSource,
	orchestrator, // Now gets a fresh instance per language
	options,
	globalStats // Used for aggregating final stats
) {
	await consoleLock.log(`\n🌐 Starting translations for ${targetLang}`);
	const langStartTime = Date.now();
	let finalStatus = null;
	let savedMessage = null;

	// Initialize language stats in globalStats
	globalStats.languages[targetLang] = {
		processed: 0,
		added: 0,
		skipped: 0,
		failed: 0,
		timeMs: 0,
	};

	try {
		const targetPath = path.join(path.dirname(sourceFile), `${targetLang}.json`);

		// Read target content (if exists)
		let targetContent = {};
		try {
			targetContent = await FileManager.readJSON(targetPath);
		} catch (err) {
			// If file doesn't exist, use empty object (will create new file)
			await consoleLock.log(`🆕 Creating new translation file for ${targetLang}`);
		}

		const flattenedTarget = ObjectTransformer.flatten(targetContent);

		// Find missing or outdated keys
		const missingKeys = [];

		for (const [key, sourceText] of Object.entries(flattenedSource)) {
			// Track what we're processing for this language in globalStats
			globalStats.languages[targetLang].processed++;

			// Skip if key exists in target and we're not forcing update
			if (key in flattenedTarget && !options.forceUpdate) {
				globalStats.languages[targetLang].skipped++;
				globalStats.skipped++;
				continue;
			}

			// Add to processing list
			missingKeys.push({
				key,
				text: sourceText,
				targetLang,
				existingTranslation: flattenedTarget[key],
			});
		}

		if (missingKeys.length === 0) {
			await consoleLock.log(`✅ All translations exist for ${targetLang}`);
			globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
			return { status: { completed: 0, total: 0, language: targetLang } }; // Return minimal status
		}

		await consoleLock.log(
			`📝 Found ${missingKeys.length} missing translations for ${targetLang}`
		);

		// Configure the progress tracker (should be handled by orchestrator constructor now)
		// if (options.progressOptions) {
		// 	orchestrator.progress.setLogToConsole(false); // Disable direct console logging
		// }

		// Process translations
		const results = await orchestrator.processTranslations(missingKeys);

		// Capture the final status from this orchestrator instance
		if (orchestrator.progress && orchestrator.progress.getStatus) {
			finalStatus = orchestrator.progress.getStatus();
		}

		// Process and save valid translations
		const validResults = results.filter((result) => result.success);

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
			globalStats.languages[targetLang].added += validResults.length;
			globalStats.languages[targetLang].failed += results.length - validResults.length;

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

			savedMessage = `\n💾 Translations saved: ${targetLang}.json`;
		}

		// Update language timing in globalStats
		globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
		return { status: finalStatus, savedMessage }; // Return status and save message
	} catch (error) {
		// Log error but continue with other languages
		await consoleLock.log(`\n❌ Error processing ${targetLang}: ${error.message}`);
		globalStats.languages[targetLang].error = error.message;
		globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
		return { status: null, error: error.message }; // Return error info
	}
}

/**
 * Validate and fix existing translations that have length issues
 */
async function validateAndFixExistingTranslations(file, options) {
	await consoleLock.log(`\n🔍 Checking existing translations in: "${path.basename(file)}"`);

	const sourceContent = await FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);
	const orchestrator = new Orchestrator(options);

	// Get all target languages in parallel
	const languageResults = await Promise.all(
		options.targets.map(async (targetLang) => {
			try {
				const targetPath = path.join(path.dirname(file), `${targetLang}.json`);
				const targetContent = await FileManager.readJSON(targetPath);
				return { targetLang, targetPath, content: targetContent, success: true };
			} catch (err) {
				await consoleLock.log(`⚠️ Could not read ${targetLang}.json: ${err.message}`);
				return { targetLang, success: false, error: err.message };
			}
		})
	);

	// Process only successful language reads
	const validLanguages = languageResults.filter((result) => result.success);

	try {
		let totalFixed = 0;
		let totalIssues = 0;

		// Create quality checker
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

			// Check all existing translations
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
					`⚠️  Found ${invalidItems.length} length issues in ${targetLang}`
				);

				// Batch process fixes to improve performance
				const results = await orchestrator.processTranslations(invalidItems);

				// Apply fixes
				const fixedCount = results.filter((r) => r.success).length;
				totalFixed += fixedCount;

				// Update translations
				results.forEach(({ key, translated, success }) => {
					if (success && translated) {
						flattenedTarget[key] = translated;
					}
				});

				// Save changes
				const unflattened = ObjectTransformer.unflatten(flattenedTarget);
				await FileManager.writeJSON(targetPath, unflattened);

				await consoleLock.log(
					`✅ Fixed ${fixedCount}/${invalidItems.length} translations in ${targetLang}`
				);
			} else {
				await consoleLock.log(`✅ No length issues found in ${targetLang}`);
			}
		}

		// Final summary
		if (totalIssues > 0) {
			await consoleLock.log(
				`\n📊 Fix Length Summary: Fixed ${totalFixed} of ${totalIssues} issues (${Math.round((totalFixed / totalIssues) * 100)}%)`
			);
		} else {
			await consoleLock.log(`\n✅ No length issues found in any language`);
		}
	} catch (error) {
		await consoleLock.log(`\n❌ Validation error: ${error.message}`);
		throw error;
	}
}

/**
 * Display a summary of the translation results
 */
async function displayGlobalSummary(stats, totalLanguages) {
	await consoleLock.log("\n🌍 Global Translation Summary:");
	await consoleLock.log(`Languages Processed: ${totalLanguages}`);
	await consoleLock.log(`Total Translations: ${stats.total}`);
	await consoleLock.log(`✅ Success: ${stats.success}`);
	await consoleLock.log(`❌ Failed: ${stats.failed}`);
	await consoleLock.log(`⏭️ Skipped: ${stats.skipped}`);
	await consoleLock.log(`⏳ Total Time: ${stats.totalTime.toFixed(1)}s`);
	await consoleLock.log(
		`⚡ Average per language: ${(stats.totalTime / totalLanguages).toFixed(1)}s`
	);

	// Display detailed language stats
	await consoleLock.log("\n📊 Per-language Performance:");
	for (const [lang, langStats] of Object.entries(stats.languages)) {
		const timeSeconds = langStats.timeMs / 1000;
		await consoleLock.log(
			`${lang}: ${langStats.added} added, ${langStats.skipped} skipped, ${langStats.failed} failed (${timeSeconds.toFixed(1)}s)`
		);
	}

	// Only show categories if we have them
	if (Object.keys(stats.byCategory).length > 0) {
		await consoleLock.log("\n📊 Context Analysis by Category:");
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
		`\n✅ All operations completed successfully in ${stats.totalDuration.toFixed(1)}s`
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

module.exports = {
	findLocaleFiles,
	translateFile,
	validateAndFixExistingTranslations,
};
