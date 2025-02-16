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

	for (const targetLang of options.targets) {
		const targetPath = path.join(path.dirname(file), `${targetLang}.json`);
		let targetContent = {};

		try {
			targetContent = FileManager.readJSON(targetPath);
		} catch {} // If file not found, use empty object

		const orchestrator = new Orchestrator(options);
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

		// Collect context statistics
		results.forEach((result) => {
			if (result.context) {
				contextStats.total++;
				contextStats.byCategory[result.context.category] =
					(contextStats.byCategory[result.context.category] || 0) + 1;
			}
		});

		results.forEach(({ key, translated }) => {
			flattenedTarget[key] = translated;
		});

		FileManager.writeJSON(
			targetPath,
			ObjectTransformer.unflatten(flattenedTarget)
		);

		// Display context statistics
		console.log("\n📊 Context Statistics:");
		console.log(`Total Detected: ${contextStats.total}`);
		Object.entries(contextStats.byCategory).forEach(([category, count]) => {
			console.log(`${category}: ${count} texts`);
		});

		console.log(`\n💾 Translations saved: ${path.basename(targetPath)}`);
	}
}

module.exports = {
	findLocaleFiles: FileManager.findLocaleFiles,
	translateFile,
};
