// lib/translator.js
const path = require("path");
const FileManager = require("./utils/FileManager");
const ObjectTransformer = require("./utils/ObjectTransformer");
const TranslationOrchestrator = require("./core/TranslationOrchestrator");

// Translate all keys in a JSON file for each target language
async function translateFile(file, options) {
	console.log(`\nProcessing File: "${file}"`);

	const sourceContent = FileManager.readJSON(file);
	const flattenedSource = ObjectTransformer.flatten(sourceContent);

	for (const targetLang of options.targets) {
		const targetPath = path.join(path.dirname(file), `${targetLang}.json`);
		let targetContent = {};

		try {
			targetContent = FileManager.readJSON(targetPath);
		} catch {} // If file not found, use empty object

		const orchestrator = new TranslationOrchestrator(options);
		const flattenedTarget = ObjectTransformer.flatten(targetContent);
		const missingKeys = Object.keys(flattenedSource).filter(
			(key) => !(key in flattenedTarget)
		);

		if (missingKeys.length === 0) {
			console.log(`✓ All translations present for ${targetLang}`);
			continue;
		}

		const translationItems = missingKeys.map((key) => ({
			key,
			text: flattenedSource[key],
			targetLang,
		}));

		const results =
			await orchestrator.processTranslations(translationItems);

		results.forEach(({ key, translated }) => {
			flattenedTarget[key] = translated;
		});

		FileManager.writeJSON(
			targetPath,
			ObjectTransformer.unflatten(flattenedTarget)
		);
		console.log(`✅ Translations saved: ${targetPath}`);
	}
}

module.exports = {
	findLocaleFiles: FileManager.findLocaleFiles,
	translateFile,
};
