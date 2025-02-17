#!/usr/bin/env node
require("dotenv").config();

const { program } = require("commander");
const path = require("path");
const fs = require("fs");
const {
	findLocaleFiles,
	translateFile,
} = require("../src/commands/translator");

// Load default configuration
let defaultConfig = {};
const configPath = path.resolve(process.cwd(), "localize.config.js");
if (fs.existsSync(configPath)) {
	defaultConfig = require(configPath);
}

program
	.version("0.1.0")
	.option("-s, --source <lang>", "Source language", defaultConfig.source)
	.option(
		"-t, --targets <langs>",
		"Target languages (comma separated)",
		(val) => val.split(","),
		defaultConfig.targets
	)
	.option(
		"--localesDir <dir>",
		"Localization files directory",
		defaultConfig.localesDir
	)
	.option(
		"--apiProvider <provider>",
		"API provider (qwen/openai/deepseek/gemini/azureDeepseek)",
		defaultConfig.apiProvider
	)
	.option(
		"--contextThreshold <number>",
		"Minimum match count (1-5)",
		(val) => parseInt(val),
		defaultConfig.context?.detection?.threshold
	)
	.option(
		"--contextConfidence <number>",
		"Minimum confidence score (0-1)",
		(val) => parseFloat(val),
		defaultConfig.context?.detection?.minConfidence
	)
	.option(
		"--contextDebug",
		"Show context analysis details",
		defaultConfig.context?.debug
	)
	.parse(process.argv);

const options = program.opts();
options.apiConfig = defaultConfig.apiConfig || {};
options.styleGuide = defaultConfig.styleGuide;
options.qualityChecks = defaultConfig.qualityChecks;
options.lengthControl = defaultConfig.lengthControl;

// Merge context settings
options.context = {
	...defaultConfig.context,
	enabled: true,
	debug: options.contextDebug,
	detection: {
		threshold: options.contextThreshold,
		minConfidence: options.contextConfidence,
	},
	categories: defaultConfig.context?.categories || {},
	fallback: defaultConfig.context?.fallback || {
		category: "general",
		prompt: "Provide a natural translation",
	},
};

if (
	!process.env.QWEN_API_KEY &&
	!process.env.OPENAI_API_KEY &&
	!process.env.DEEPSEEK_API_KEY
) {
	console.error(
		"\n❌ Error: No API key found. At least one API key is required."
	);
	process.exit(1);
}

(async () => {
	try {
		const localesDirPath = path.resolve(options.localesDir);
		const localeFiles = findLocaleFiles(localesDirPath);

		if (localeFiles.length === 0) {
			throw new Error(
				`No JSON files found in directory: ${localesDirPath}`
			);
		}

		// If context debug mode is active, provide information
		if (options.context.debug) {
			console.log("\n🔍 Context Settings:");
			console.log(`Threshold: ${options.context.detection.threshold}`);
			console.log(
				`Min Confidence: ${options.context.detection.minConfidence}`
			);
			console.log(
				`Categories: ${Object.keys(options.context.categories).join(", ")}`
			);
		}

		console.log(`\n📁 Found files: ${localeFiles.join(", ")}`);

		for (const file of localeFiles) {
			await translateFile(file, options);
		}

		console.log("✅ All files translated successfully.");
	} catch (error) {
		console.error("\n❌ Error:", error.message);
		process.exit(1);
	}
})();
