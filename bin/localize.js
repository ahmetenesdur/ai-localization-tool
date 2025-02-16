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
		"--contextMode <mode>",
		"Context mode (auto/manual/hybrid)",
		defaultConfig.context?.mode
	)
	.option(
		"--contextThreshold <number>",
		"Context threshold value",
		(val) => parseInt(val),
		defaultConfig.context?.detection?.threshold
	)
	.option(
		"--contextConfidence <number>",
		"Minimum confidence score (0-1)",
		(val) => parseFloat(val),
		defaultConfig.context?.detection?.minConfidence
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
	mode: options.contextMode || defaultConfig.context?.mode,
	detection: {
		...defaultConfig.context?.detection,
		threshold:
			options.contextThreshold ||
			defaultConfig.context?.detection?.threshold,
		minConfidence:
			options.contextConfidence ||
			defaultConfig.context?.detection?.minConfidence,
	},
};

(async () => {
	try {
		const localesDirPath = path.resolve(options.localesDir);
		const localeFiles = findLocaleFiles(localesDirPath);

		if (localeFiles.length === 0) {
			throw new Error(
				`No JSON files found in directory: ${localesDirPath}`
			);
		}

		console.log(`Found files: ${localeFiles.join(", ")}`);

		for (const file of localeFiles) {
			await translateFile(file, options);
		}

		console.log("✅ All files translated successfully.");
	} catch (error) {
		console.error("❌ Error:", error.message);
		process.exit(1);
	}
})();
