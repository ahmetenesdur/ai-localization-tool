const path = require("path");
const FileManager = require("../utils/file-manager");
const ObjectTransformer = require("../utils/object-transformer");
const Orchestrator = require("../core/orchestrator");
const QualityChecker = require("../utils/quality");

// Translate all keys in a JSON file for each target language
async function translateFile(file, options) {
	console.log(`\n📄 Processing File: "${path.basename(file)}"`);

	const sourceContent = FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);

	// Global stats for all languages
	const globalStats = {
		total: 0,
		byCategory: {},
		details: {},
		totalTime: 0,
		success: 0,
		failed: 0,
	};

	const orchestrator = new Orchestrator(options);

	try {
		for (const targetLang of options.targets) {
			console.log(`\n🌐 Starting translations for ${targetLang}`);

			const targetPath = path.join(
				path.dirname(file),
				`${targetLang}.json`
			);

			let targetContent = {};
			try {
				targetContent = FileManager.readJSON(targetPath);
			} catch {} // If file not found, use empty object

			const flattenedTarget = ObjectTransformer.flatten(targetContent);
			const missingKeys = Object.keys(flattenedSource).filter(
				(key) => !(key in flattenedTarget)
			);

			if (missingKeys.length === 0) {
				console.log(`✅ All translations exist for ${targetLang}`);
				continue;
			}

			console.log(`📝 Found ${missingKeys.length} missing translations`);

			const translationItems = missingKeys.map((key) => ({
				key,
				text: flattenedSource[key],
				targetLang,
			}));

			const results = await orchestrator.processTranslations(
				translationItems
			);

			// Process and save valid translations
			const validResults = results.filter((result) => result.success);

			if (validResults.length > 0) {
				validResults.forEach(({ key, translated }) => {
					flattenedTarget[key] = translated;
				});

				const unflattened =
					ObjectTransformer.unflatten(flattenedTarget);
				FileManager.writeJSON(targetPath, unflattened);

				// Update statistics
				globalStats.total += validResults.length;
				globalStats.success += validResults.length;
				globalStats.failed += results.length - validResults.length;
				globalStats.totalTime += parseFloat(
					orchestrator.progress.statistics.totalTime || 0
				);

				// Update category stats if context data exists
				validResults.forEach((result) => {
					if (result.context) {
						const category = result.context.category || "general";
						globalStats.byCategory[category] =
							(globalStats.byCategory[category] || 0) + 1;

						if (!globalStats.details[category]) {
							globalStats.details[category] = {
								totalConfidence: 0,
								samples: 0,
							};
						}

						globalStats.details[category].totalConfidence +=
							result.context.confidence || 0;
						globalStats.details[category].samples++;
					}
				});

				console.log(`\n💾 Translations saved: ${targetLang}.json`);
			}
		}

		displayGlobalSummary(globalStats, options.targets.length);
	} catch (error) {
		console.error(`\n❌ Translation error: ${error.message}`);
		throw error;
	}
}

async function validateAndFixExistingTranslations(file, options) {
	console.log(
		`\n🔍 Checking existing translations in: "${path.basename(file)}"`
	);

	const sourceContent = FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);
	const orchestrator = new Orchestrator(options);

	try {
		for (const targetLang of options.targets) {
			const targetPath = path.join(
				path.dirname(file),
				`${targetLang}.json`
			);
			const targetContent = FileManager.readJSON(targetPath);
			const flattenedTarget = ObjectTransformer.flatten(targetContent);

			const invalidItems = [];
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

			// Check all existing translations
			for (const [key, translatedText] of Object.entries(
				flattenedTarget
			)) {
				const sourceText = flattenedSource[key];
				if (!sourceText) continue;

				const checkResult = qualityChecker.validate(
					sourceText,
					translatedText,
					options
				);
				const lengthIssue = checkResult.issues.find(
					(i) => i.type === "length"
				);

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
				console.log(
					`⚠️  Found ${invalidItems.length} length issues in ${targetLang}`
				);
				const results = await orchestrator.processTranslations(
					invalidItems
				);

				// Apply fixes
				const fixedCount = results.filter((r) => r.success).length;
				results.forEach(({ key, translated }) => {
					if (translated) {
						flattenedTarget[key] = translated;
					}
				});

				const unflattened =
					ObjectTransformer.unflatten(flattenedTarget);
				FileManager.writeJSON(targetPath, unflattened);
				console.log(
					`✅ Fixed ${fixedCount}/${invalidItems.length} translations in ${targetLang}`
				);
			} else {
				console.log(`✅ No length issues found in ${targetLang}`);
			}
		}
	} catch (error) {
		console.error(`\n❌ Validation error: ${error.message}`);
		throw error;
	}
}

function displayGlobalSummary(stats, totalLanguages) {
	console.log("\n🌍 Global Translation Summary:");
	console.log(`Languages Processed: ${totalLanguages}`);
	console.log(`Total Translations: ${stats.total}`);
	console.log(`✅ Success: ${stats.success}`);
	console.log(`❌ Failed: ${stats.failed}`);
	console.log(`⏳ Total Time: ${stats.totalTime.toFixed(1)}s`);

	if (Object.keys(stats.byCategory).length > 0) {
		console.log("\n📊 Context Analysis by Category:");
		Object.entries(stats.byCategory).forEach(([category, count]) => {
			const details = stats.details[category];
			if (details && details.samples > 0) {
				const avgConfidence = details.totalConfidence / details.samples;
				const confidenceStr = `${(avgConfidence * 100).toFixed(1)}%`;
				console.log(
					`${category}: ${count} items (${confidenceStr} avg confidence)`
				);
			} else {
				console.log(`${category}: ${count} items`);
			}
		});
	}
}

module.exports = {
	findLocaleFiles: FileManager.findLocaleFiles,
	translateFile,
	validateAndFixExistingTranslations,
};
