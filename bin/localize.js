#!/usr/bin/env node
require("dotenv").config();

const { program } = require("commander");
const path = require("path");
const { ProgressTracker } = require("../src/utils/progress-tracker");
const {
	findLocaleFiles,
	translateFile,
} = require("../src/commands/translator");

// Utility functions
const loadConfig = (configPath) => {
	try {
		return require("fs").existsSync(configPath) ? require(configPath) : {};
	} catch (err) {
		throw new Error(`Config load error: ${err.message}`);
	}
};

const validateConfig = (config) => {
	const requiredFields = ["source", "targets", "localesDir"];
	const missing = requiredFields.filter((field) => !config[field]);
	if (missing.length) {
		throw new Error(
			`Missing required config fields: ${missing.join(", ")}`
		);
	}
};

const checkApiKeys = () => {
	const providers = [
		"QWEN_API_KEY",
		"OPENAI_API_KEY",
		"DEEPSEEK_API_KEY",
		"AZURE_DEEPSEEK_API_KEY",
		"GEMINI_API_KEY",
		"XAI_API_KEY",
	];
	const availableKeys = providers.filter((key) => process.env[key]);

	if (availableKeys.length === 0) {
		throw new Error(
			"No API keys found. At least one provider key is required."
		);
	}
	return availableKeys;
};

const setupContext = (options, defaultConfig) => {
	return {
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
};

const processFiles = async (files, options, progress) => {
	const concurrency = parseInt(process.env.CONCURRENCY) || 3;
	const chunks = [];

	for (let i = 0; i < files.length; i += concurrency) {
		const chunk = files.slice(i, i + concurrency);
		const promises = chunk.map((file) =>
			translateFile(file, options)
				.then(() => progress.increment("success"))
				.catch((error) => {
					console.error(
						`\n❌ Error processing ${path.basename(file)}:`,
						error.message
					);
					progress.increment("failed");
				})
		);
		await Promise.all(promises);
	}
};

// Main execution
(async () => {
	try {
		// Load and validate configuration
		const configPath = path.resolve(process.cwd(), "localize.config.js");
		const defaultConfig = loadConfig(configPath);

		// Setup CLI options
		program
			.version("0.1.0")
			.option(
				"-s, --source <lang>",
				"Source language",
				defaultConfig.source
			)
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
				"API provider (qwen/openai/deepseek/gemini/azuredeepseek/xai)",
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
		validateConfig(options);

		// Merge configurations
		options.apiConfig = defaultConfig.apiConfig || {};
		options.styleGuide = defaultConfig.styleGuide;
		options.qualityChecks = defaultConfig.qualityChecks;
		options.lengthControl = defaultConfig.lengthControl;
		options.context = setupContext(options, defaultConfig);

		// Validate API keys
		const availableProviders = checkApiKeys();
		console.log(`\n🔑 Available Providers: ${availableProviders.length}`);

		// Process files
		const localesDirPath = path.resolve(options.localesDir);
		const localeFiles = findLocaleFiles(localesDirPath);

		if (localeFiles.length === 0) {
			throw new Error(
				`No JSON files found in directory: ${localesDirPath}`
			);
		}

		// Display context debug info if enabled
		if (options.context.debug) {
			console.log("\n🔍 Context Settings:");
			console.log(`Threshold: ${options.context.detection.threshold}`);
			console.log(
				`Min Confidence: ${options.context.detection.minConfidence}`
			);
			console.log(
				`Categories: ${Object.keys(options.context.categories).join(
					", "
				)}`
			);
		}

		console.log(`\n📁 Found ${localeFiles.length} files to process`);

		// Initialize progress tracking
		const progress = new ProgressTracker();
		progress.start(localeFiles.length);

		// Process files with concurrency
		await processFiles(localeFiles, options, progress);
	} catch (error) {
		console.error("\n❌ Critical Error:", error.message);
		process.exit(1);
	}
})();
