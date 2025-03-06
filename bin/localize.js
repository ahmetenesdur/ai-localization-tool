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
const ProviderFactory = require("../src/core/provider-factory");

const loadConfig = () => {
	try {
		const configPath = path.resolve(process.cwd(), "localize.config.js");
		return require(configPath);
	} catch (error) {
		console.warn(`Warning: Could not load config file: ${error.message}`);
		return {
			source: "en",
			targets: [],
			localesDir: "./locales",
			concurrencyLimit: 5,
			cacheEnabled: true,
			context: {
				enabled: true,
				detection: { threshold: 2, minConfidence: 0.6 },
				useAI: false,
				minTextLength: 50,
				debug: false,
			},
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
		.option("--localesDir <dir>", "Localization files directory", defaultConfig.localesDir)
		.option("--apiProvider <provider>", "AI provider", defaultConfig.apiProvider)
		.option(
			"--concurrency <number>",
			"Number of concurrent translations",
			Number,
			defaultConfig.concurrencyLimit
		)
		.option("--noCache", "Disable translation caching", !defaultConfig.cacheEnabled)
		.option("--debug", "Enable debug mode with verbose logging", false)
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
		.option("--contextDebug", "Show context details", defaultConfig.context.debug)
		.option("--fix-length", "Fix existing translations with length issues", false)
		.option("--useAI", "Enable AI-based context analysis", defaultConfig.context.useAI)
		.option(
			"--aiProvider <provider>",
			"AI provider for context analysis",
			defaultConfig.context.aiProvider
		)
		.option(
			"--minTextLength <number>",
			"Minimum text length for AI analysis",
			Number,
			defaultConfig.context.minTextLength
		)
		.option(
			"--allowNewCategories",
			"Allow AI to suggest new categories",
			defaultConfig.context.allowNewCategories
		)
		.option(
			"--maxRetries <number>",
			"Maximum number of retries for API calls",
			Number,
			defaultConfig.retryOptions?.maxRetries || 2
		)
		.parse(process.argv);

	const opts = program.opts();

	// Set global debug mode if requested
	if (opts.debug) {
		process.env.DEBUG = "true";
		console.log("🔍 Debug mode: ENABLED (verbose logging)");
	}

	return {
		...opts,
		debug: opts.debug,
		concurrencyLimit: parseInt(opts.concurrency) || 5,
		cacheEnabled: !opts.noCache,
		apiConfig: defaultConfig.apiConfig || {},
		styleGuide: defaultConfig.styleGuide,
		qualityChecks: defaultConfig.qualityChecks,
		lengthControl: defaultConfig.lengthControl,
		retryOptions: {
			...defaultConfig.retryOptions,
			maxRetries: opts.maxRetries,
		},
		context: {
			...defaultConfig.context,
			enabled: true,
			debug: opts.contextDebug,
			useAI: opts.useAI,
			aiProvider: opts.aiProvider,
			minTextLength: opts.minTextLength,
			allowNewCategories: opts.allowNewCategories,
			detection: {
				threshold: opts.contextThreshold,
				minConfidence: opts.contextConfidence,
			},
		},
	};
};

const validateEnvironment = () => {
	try {
		// ProviderFactory'nin validateProviders metodunu kullan
		const availableProviders = ProviderFactory.validateProviders();

		// Kullanılabilir sağlayıcıları logla
		console.log(`\n🔑 Available API providers: ${availableProviders.join(", ")}`);

		return availableProviders;
	} catch (error) {
		console.error("\n❌ Error: " + error.message);
		console.error("Please set at least one of the following environment variables:");

		// List all possible providers
		const possibleProviders = [
			"DASHSCOPE_API_KEY",
			"OPENAI_API_KEY",
			"DEEPSEEK_API_KEY",
			"GEMINI_API_KEY",
			"XAI_API_KEY",
			"AZURE_DEEPSEEK_API_KEY",
		];

		possibleProviders.forEach((key) => console.error(`  - ${key}`));
		process.exit(1);
	}
};

(async () => {
	try {
		const defaultConfig = loadConfig();
		const options = configureCLI(defaultConfig);
		validateEnvironment();

		// Debug için detaylı bilgiler
		if (options.debug) {
			console.log("\n📋 Configuration details:");
			console.log(JSON.stringify(options, null, 2));
		}

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
				files.map((file) => validateAndFixExistingTranslations(file, options))
			);
		} else {
			console.log("\n🚀 Running in STANDARD TRANSLATION mode");

			if (options.context.useAI) {
				console.log(
					`🧠 AI Context Analysis: ENABLED (Provider: ${options.context.aiProvider})`
				);
				if (options.context.allowNewCategories) {
					console.log("🔄 New category suggestions: ENABLED");
				}
			}

			console.log(`⚙️ Performance settings:`);
			console.log(`   - Concurrency: ${options.concurrencyLimit} parallel operations`);
			console.log(`   - Caching: ${options.cacheEnabled ? "Enabled" : "Disabled"}`);
			console.log(`   - Retries: ${options.retryOptions.maxRetries} max retries`);

			await Promise.all(files.map((file) => translateFile(file, options)));
		}

		console.log("\n✅ All operations completed successfully");
	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);
		if (error.stack && process.env.DEBUG) {
			console.error(error.stack);
		}
		process.exit(1);
	}
})();
