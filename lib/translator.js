// lib/translator.js
const fs = require("fs");
const path = require("path");
const TranslationCache = require("./cache");

// Import all provider modules
const openaiProvider = require("./providers/openai");
const deepseekProvider = require("./providers/deepseek");
const geminiProvider = require("./providers/gemini");
const opensourceProvider = require("./providers/opensource");

const cache = new TranslationCache();

// Helper function to select the provider based on the option
function getApiProvider(providerName, fallback = true) {
	const providers = {
		deepseek: deepseekProvider,
		gemini: geminiProvider,
		opensource: opensourceProvider,
		openai: openaiProvider,
	};

	const selected = providers[providerName.toLowerCase()] || openaiProvider;

	if (!selected && fallback) {
		console.warn(`⚠️  Provider ${providerName} not found, using fallback`);
		return openaiProvider;
	}
	return selected;
}

// Recursively search for all JSON files in the specified directory
function findLocaleFiles(localesDir) {
	const files = [];
	function walk(dir) {
		try {
			const items = fs.readdirSync(dir);
			items.forEach((file) => {
				const filepath = path.join(dir, file);
				const stat = fs.statSync(filepath);
				if (stat.isDirectory()) {
					walk(filepath);
				} else if (filepath.endsWith(".json")) {
					files.push(filepath);
				}
			});
		} catch (err) {
			console.error(`Error reading directory (${dir}):`, err.message);
		}
	}
	walk(localesDir);
	return files;
}

// New helper function
function detectContext(text) {
	const contextPatterns = {
		technical: /(\bAPI\b|\bendpoint\b|\bconfig\b)/i,
		marketing: /(\bbuy\b|\boffer\b|\bdiscount\b)/i,
		UI: /(\bbutton\b|\bmenu\b|\bclick\b)/i,
	};

	for (const [context, pattern] of Object.entries(contextPatterns)) {
		if (pattern.test(text)) return context;
	}
	return "general";
}

// Translate all keys in a JSON file for each target language
async function translateFile(file, options) {
	console.log(`\nStarting translation for file: "${file}"`);

	// Existing file check
	if (
		options.targets.some((lang) => {
			const outputPath = path.join(path.dirname(file), `${lang}.json`);
			return fs.existsSync(outputPath) && !options.force;
		})
	) {
		console.warn(
			"⚠️  Target files already exist! Use --force to overwrite"
		);
		return;
	}

	// Error handling improvements
	let content;
	try {
		const fileContent = fs.readFileSync(file, "utf-8");
		content = JSON.parse(fileContent);
		if (Object.keys(content).length === 0) {
			throw new Error("Empty JSON file");
		}
	} catch (err) {
		console.error(`❌ Error reading/parsing file (${file}):`, err.message);
		if (options.debug) {
			console.error("Stack trace:", err.stack);
		}
		return;
	}

	// Process each target language
	for (const targetLang of options.targets) {
		console.log(`\nTranslating to ${targetLang}...`);
		const keys = Object.keys(content);

		// Translate each text in parallel using Promise.all
		const translationPromises = keys.map(async (key) => {
			const text = content[key];
			try {
				const cached = cache.get(
					text,
					options.source,
					targetLang,
					options
				);
				if (cached) {
					return { key, translated: cached };
				}

				const context = options.contextDetection
					? detectContext(text)
					: options.context;
				const provider = getApiProvider(options.apiProvider);
				const translated = await provider.translate(
					text,
					options.source,
					targetLang,
					{ ...options, context }
				);
				cache.set(
					text,
					options.source,
					targetLang,
					options,
					translated
				);
				return { key, translated };
			} catch (err) {
				console.error(`Error translating key "${key}":`, err.message);
				// In case of error, return the original text
				return { key, translated: text };
			}
		});

		let translatedResults;
		try {
			translatedResults = await Promise.all(translationPromises);
		} catch (err) {
			console.error("Error during parallel translation:", err.message);
			continue;
		}

		// Build the translated content object
		const translatedContent = {};
		translatedResults.forEach(({ key, translated }) => {
			translatedContent[key] = translated;
		});

		// Çeviri sonrası validasyon
		try {
			JSON.parse(JSON.stringify(translatedContent));
		} catch (err) {
			console.error(
				`❌ Invalid JSON structure for ${targetLang}:`,
				err.message
			);
			if (options.debug) {
				console.error("Problematic content:", translatedContent);
			}
		}

		// Write the translated content to a new JSON file
		try {
			const dir = path.dirname(file);
			const outputFileName = `${targetLang}.json`;
			const outputPath = path.join(dir, outputFileName);
			fs.writeFileSync(
				outputPath,
				JSON.stringify(translatedContent, null, 2),
				"utf-8"
			);
			console.log(
				`Translation for ${targetLang} completed: ${outputPath}`
			);
		} catch (err) {
			console.error(`Error writing file for ${targetLang}:`, err.message);
		}
	}
}

module.exports = { findLocaleFiles, translateFile };
