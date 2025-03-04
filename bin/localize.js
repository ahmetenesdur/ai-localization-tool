#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
	require("dotenv").config({ path: envLocalPath });
}

const { program } = require("commander");
const {
	translateFile,
	findLocaleFiles,
	validateAndFixExistingTranslations,
} = require("../src/commands/translator");

const loadConfig = () => {
	try {
		const configPath = path.resolve(process.cwd(), "localize.config.js");
		return require(configPath);
	} catch {
		return {
			source: "en",
			targets: [],
			localesDir: "./locales",
			context: { detection: { threshold: 2, minConfidence: 0.6 } },
		};
	}
};

const configureCLI = (defaultConfig) => {
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
			"AI provider",
			defaultConfig.apiProvider
		)
		.option(
			"--contextThreshold <number>",
			"Minimum match count",
			Number,
			defaultConfig.context.detection.threshold
		)
		.option(
			"--contextConfidence <number>",
			"Minimum confidence score",
			Number,
			defaultConfig.context.detection.minConfidence
		)
		.option(
			"--contextDebug",
			"Show context details",
			defaultConfig.context.debug
		)
		.option(
			"--fix-length",
			"Fix existing translations with length issues",
			false
		)
		.parse(process.argv);

	return {
		...program.opts(),
		apiConfig: defaultConfig.apiConfig || {},
		styleGuide: defaultConfig.styleGuide,
		qualityChecks: defaultConfig.qualityChecks,
		lengthControl: defaultConfig.lengthControl,
		context: {
			...defaultConfig.context,
			enabled: true,
			debug: program.opts().contextDebug,
			detection: {
				threshold: program.opts().contextThreshold,
				minConfidence: program.opts().contextConfidence,
			},
		},
	};
};

const validateEnvironment = () => {
	const requiredKeys = [
		"DASHSCOPE_API_KEY",
		"OPENAI_API_KEY",
		"DEEPSEEK_API_KEY",
		"GEMINI_API_KEY",
		"XAI_API_KEY",
		"AZURE_DEEPSEEK_API_KEY",
	];

	if (!requiredKeys.some((key) => process.env[key])) {
		console.error("\n❌ Error: Missing required API key");
		process.exit(1);
	}
};

(async () => {
	try {
		const defaultConfig = loadConfig();
		const options = configureCLI(defaultConfig);
		validateEnvironment();

		const localesDir = path.resolve(options.localesDir);
		const files = findLocaleFiles(localesDir, options.source);

		if (!files.length) {
			throw new Error(
				`Source language file (${options.source}.json) not found in: ${localesDir}`
			);
		}

		if (options.fixLength) {
			console.log("\n🔧 Running in LENGTH FIX mode");
			await Promise.all(
				files.map((file) =>
					validateAndFixExistingTranslations(file, options)
				)
			);
		} else {
			console.log("\n🚀 Running in STANDARD TRANSLATION mode");
			await Promise.all(
				files.map((file) => translateFile(file, options))
			);
		}

		console.log("\n✅ All operations completed successfully");
	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);
		process.exit(1);
	}
})();
