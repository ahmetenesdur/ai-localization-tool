const path = require("path");
const FileManager = require("../utils/file-manager");
const ObjectTransformer = require("../utils/object-transformer");
const Orchestrator = require("../core/orchestrator");

// Translate all keys in a JSON file for each target language
async function translateFile(file, options) {
	console.log(`\n📂 Processing File: "${path.basename(file)}"`);

	const sourceContent = FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);

	// Counter for context statistics
	const contextStats = {
		total: 0,
		byCategory: {},
	};

	const orchestrator = new Orchestrator(options);

	try {
		for (const targetLang of options.targets) {
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
				console.log(`✨ All translations exist for ${targetLang}`);
				continue;
			}

			const translationItems = missingKeys.map((key) => ({
				key,
				text: flattenedSource[key],
				targetLang,
			}));

			const results =
				await orchestrator.processTranslations(translationItems);

			// Check translation results
			const validResults = results.filter((result) => {
				if (
					result.error ||
					!result.translated ||
					result.translated === result.key
				) {
					console.log(`❌ Translation failed: ${result.key}`);
					return false;
				}
				return true;
			});

			// Save only valid translations
			if (validResults.length > 0) {
				validResults.forEach(({ key, translated }) => {
					flattenedTarget[key] = translated;
				});

				FileManager.writeJSON(
					targetPath,
					ObjectTransformer.unflatten(flattenedTarget)
				);
				console.log(
					`\n💾 Translations saved: ${path.basename(targetPath)}`
				);
			} else {
				console.log(
					`\n⚠️ No valid translations found: ${path.basename(targetPath)}`
				);
			}

			// Collect context statistics
			results.forEach((result) => {
				updateContextStats(result, contextStats);
			});

			// Display context statistics
			displayContextStats(contextStats);
		}
	} finally {
		process.exitCode = 0;
	}
}

function updateContextStats(result, stats) {
	if (result.context) {
		stats.total++;
		const category = result.context.category;
		stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

		// Detailed statistics
		if (!stats.details) stats.details = {};
		if (!stats.details[category]) {
			stats.details[category] = {
				totalConfidence: 0,
				samples: 0,
			};
		}

		stats.details[category].totalConfidence += result.context.confidence;
		stats.details[category].samples++;
	}
}

// Display statistics
function displayContextStats(stats) {
	console.log("\n📊 Context Statistics:");
	console.log(`Total Processed: ${stats.total}`);

	Object.entries(stats.byCategory).forEach(([category, count]) => {
		const details = stats.details[category];
		const avgConfidence = details.totalConfidence / details.samples;
		console.log(
			`${category}: ${count} texts (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`
		);
	});
}

module.exports = {
	findLocaleFiles: FileManager.findLocaleFiles,
	translateFile,
};
