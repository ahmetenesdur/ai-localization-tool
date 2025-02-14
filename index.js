#!/usr/bin/env node

const { program } = require("commander");
const path = require("path");
const fs = require("fs");
const { findLocaleFiles, translateFile } = require("./lib/translator");
require("dotenv").config();

// Load default configuration if available
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
		"Target languages (comma separated, e.g., tr,es)",
		(val) => val.split(","),
		defaultConfig.targets
	)
	.option(
		"--localesDir <dir>",
		"Directory for locale files",
		defaultConfig.localesDir || "./locales"
	)
	.option(
		"--context <context>",
		"Context for translation",
		defaultConfig.context
	)

	// Advanced settings
	.option(
		"--translationMemory",
		"Use translation memory",
		defaultConfig.translationMemory
	)
	.option(
		"--qualityChecks",
		"Enable quality checks",
		defaultConfig.qualityChecks
	)
	.option(
		"--contextDetection",
		"Enable context detection",
		defaultConfig.contextDetection
	)

	// Style guide options
	.option(
		"--lengthControl <length>",
		"Control text length",
		defaultConfig.styleGuide.lengthControl
	)
	.option(
		"--inclusiveLanguage",
		"Use inclusive language",
		defaultConfig.styleGuide.inclusiveLanguage
	)
	.option(
		"--formality <level>",
		"Formality level (Casual/Formal)",
		defaultConfig.styleGuide.formality
	)
	.option(
		"--toneOfVoice <tone>",
		"Tone of voice",
		defaultConfig.styleGuide.toneOfVoice
	)

	// Brand options
	.option("--brandName <name>", "Brand name", defaultConfig.brandName)
	.option("--brandVoice <voice>", "Brand voice", defaultConfig.brandVoice)
	.option(
		"--emotiveIntent <intent>",
		"Emotive intent",
		defaultConfig.emotiveIntent
	)

	// Domain and idioms
	.option(
		"--domainExpertise <domain>",
		"Domain expertise",
		defaultConfig.domainExpertise
	)
	.option("--idioms", "Handle idioms", defaultConfig.idioms)

	// API provider selection
	.option(
		"--apiProvider <provider>",
		"API provider (openai/deepseek/gemini/opensource)",
		defaultConfig.apiProvider
	)
	.parse(process.argv);

const options = program.opts();
options.apiConfig = defaultConfig.apiConfig || {};

(async () => {
	try {
		const localesDirPath = path.resolve(options.localesDir);
		const localeFiles = findLocaleFiles(localesDirPath);
		if (localeFiles.length === 0) {
			console.error(
				`No JSON files found in the specified directory: ${localesDirPath}`
			);
			process.exit(1);
		}
		console.log(`Found files: ${localeFiles.join(", ")}`);

		// Process each locale file
		for (const file of localeFiles) {
			await translateFile(file, options);
		}
		console.log("All files translated successfully.");
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
})();
