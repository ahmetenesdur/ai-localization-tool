#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const { program } = require("commander");
const {
	translateFile,
	findLocaleFiles,
	validateAndFixExistingTranslations,
} = require("../src/commands/translator");
const ProviderFactory = require("../src/core/provider-factory");
const { FileManager } = require("../src/utils/file-manager");
const rateLimiter = require("../src/utils/rate-limiter");
const Orchestrator = require("../src/core/orchestrator");

// Load environment variables from .env.local if it exists
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fsSync.existsSync(envLocalPath)) {
	require("dotenv").config({ path: envLocalPath });
}

/**
 * Load configuration from localize.config.js
 */
const loadConfig = async () => {
	try {
		// Look for config file in current directory and parent directories
		const configPaths = [
			path.resolve(process.cwd(), "localize.config.js"),
			path.resolve(process.cwd(), "../localize.config.js"),
			path.resolve(process.cwd(), "../../localize.config.js"),
		];

		let configFile = null;
		for (const configPath of configPaths) {
			try {
				await fs.access(configPath);
				configFile = configPath;
				break;
			} catch (e) {
				// File doesn't exist, try next path
			}
		}

		if (!configFile) {
			throw new Error("Config file not found in working directory or parent directories");
		}

		console.log(`🔍 Loading config from: ${path.relative(process.cwd(), configFile)}`);
		return require(configFile);
	} catch (error) {
		console.warn(`⚠️ Could not load config file: ${error.message}`);
		return {
			source: "en",
			targets: [],
			localesDir: "./locales",
			concurrencyLimit: 5,
			cacheEnabled: true,
			retryOptions: {
				maxRetries: 2,
				initialDelay: 1000,
				maxDelay: 10000,
			},
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

/**
 * Configure file system and other components
 */
const configureComponents = (config) => {
	// Configure file operations
	if (config.fileOperations) {
		FileManager.configure(config.fileOperations);
	}

	// Configure rate limiter
	if (config.rateLimiter) {
		rateLimiter.updateConfig({
			queueStrategy: config.rateLimiter.queueStrategy || "priority",
			queueTimeout: config.rateLimiter.queueTimeout || 30000,
			adaptiveThrottling: config.rateLimiter.adaptiveThrottling !== false,
		});
	}

	// Configure environment variables if needed
	if (config.advanced?.debug) {
		process.env.DEBUG = "true";
	}

	if (config.logging?.verbose) {
		process.env.VERBOSE = "true";
	}
};

/**
 * Configure CLI options
 */
const configureCLI = async (defaultConfig) => {
	// Setup components based on config file
	configureComponents(defaultConfig);

	// Main program setup
	program
		.name("localize")
		.description("AI-powered localization tool for Next.js projects")
		.version("1.0.0");

	// Common global options
	program
		.option("-s, --source <lang>", "Source language", defaultConfig.source)
		.option(
			"-t, --targets <langs>",
			"Target languages (comma separated)",
			(val) => val.split(","),
			defaultConfig.targets
		)
		.option("--localesDir <dir>", "Localization files directory", defaultConfig.localesDir)
		.option("--debug", "Enable debug mode with verbose logging", false)
		.option("--verbose", "Enable detailed diagnostic output", false);

	// Set debug mode if requested
	program.on("option:debug", function () {
		process.env.DEBUG = "true";
		console.log("🔍 Debug mode: ENABLED (verbose logging)");
	});

	// Set verbose mode if requested
	program.on("option:verbose", function () {
		process.env.VERBOSE = "true";
		console.log("🔍 Verbose mode: ENABLED (detailed diagnostics)");
	});

	// Run helper for all actions
	const runCommand = async (options, commandOptions, commandName) => {
		// Set up global debug mode if requested
		const globalOpts = program.opts();

		if (globalOpts.debug) {
			// Debug CLI options
			console.log("CLI Command:", commandName);
			console.log("Global Options:", JSON.stringify(globalOpts, null, 2));
			console.log("Command Options:", JSON.stringify(commandOptions, null, 2));
		}

		// Merge configurations: Defaults < Global < Command
		const mergedOpts = { ...globalOpts, ...commandOptions };

		// Set up concurrency options
		let concurrencyLimit =
			parseInt(mergedOpts.concurrency) || defaultConfig.concurrencyLimit || 5;

		// Auto-optimize if requested
		if (mergedOpts.autoOptimize) {
			const cpuCount = os.cpus().length;
			const memoryGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));

			// Adjust concurrency based on available CPU cores and memory
			if (memoryGB < 4) {
				concurrencyLimit = Math.min(3, cpuCount);
			} else if (memoryGB < 8) {
				concurrencyLimit = Math.min(5, Math.ceil(cpuCount * 0.5));
			} else {
				concurrencyLimit = Math.min(10, Math.ceil(cpuCount * 0.75));
			}

			console.log(
				`🔧 Auto-optimized settings for your system (${cpuCount} CPUs, ${memoryGB}GB RAM):`
			);
			console.log(`   - Concurrency: ${concurrencyLimit}`);
		}

		// Create final config
		const finalConfig = {
			...defaultConfig,
			command: commandName,
			source: mergedOpts.source,
			targets: mergedOpts.targets,
			localesDir: mergedOpts.localesDir,
			apiProvider: mergedOpts.provider || defaultConfig.apiProvider,
			concurrencyLimit: concurrencyLimit,
			cacheEnabled:
				mergedOpts.noCache === undefined ? defaultConfig.cacheEnabled : !mergedOpts.noCache,
			debug: mergedOpts.debug,
			verbose: mergedOpts.verbose || defaultConfig.logging?.verbose || false,
			forceUpdate: mergedOpts.force || false,
			showDetailedStats: mergedOpts.stats || false,
			autoOptimize: mergedOpts.autoOptimize || defaultConfig.advanced?.autoOptimize || false,
			fixLength: commandName === "fix",
			apiConfig: defaultConfig.apiConfig || {},
			styleGuide: defaultConfig.styleGuide,
			qualityChecks: defaultConfig.qualityChecks,
			lengthControl: {
				...defaultConfig.lengthControl,
				mode: mergedOpts.length || defaultConfig.lengthControl?.mode || "smart",
			},
			retryOptions: {
				...defaultConfig.retryOptions,
				maxRetries: mergedOpts.maxRetries || defaultConfig.retryOptions?.maxRetries || 2,
				initialDelay:
					mergedOpts.initialDelay || defaultConfig.retryOptions?.initialDelay || 1000,
				maxDelay: mergedOpts.maxDelay || defaultConfig.retryOptions?.maxDelay || 10000,
				jitter: defaultConfig.retryOptions?.jitter !== false,
			},
			context: {
				...defaultConfig.context,
				enabled: true,
				debug: mergedOpts.contextDebug || defaultConfig.context.debug || false,
				useAI:
					mergedOpts.useAi ||
					mergedOpts.contextProvider !== undefined ||
					defaultConfig.context.useAI ||
					false,
				aiProvider: mergedOpts.contextProvider || defaultConfig.context.aiProvider,
				minTextLength: mergedOpts.minTextLength || defaultConfig.context.minTextLength,
				allowNewCategories:
					mergedOpts.allowNewCategories !== undefined
						? mergedOpts.allowNewCategories
						: defaultConfig.context.allowNewCategories,
				detection: {
					threshold:
						mergedOpts.contextThreshold ||
						defaultConfig.context.detection?.threshold ||
						2,
					minConfidence:
						mergedOpts.contextConfidence ||
						defaultConfig.context.detection?.minConfidence ||
						0.6,
				},
			},
			// Include advanced configuration
			advanced: {
				...defaultConfig.advanced,
				timeoutMs: mergedOpts.timeout || defaultConfig.advanced?.timeoutMs || 60000,
				maxKeyLength: defaultConfig.advanced?.maxKeyLength || 10000,
				maxBatchSize: defaultConfig.advanced?.maxBatchSize || 50,
				autoOptimize:
					mergedOpts.autoOptimize || defaultConfig.advanced?.autoOptimize || false,
				debug: mergedOpts.debug || defaultConfig.advanced?.debug || false,
			},
			// Include rate limiter configuration
			rateLimiter: {
				...defaultConfig.rateLimiter,
				enabled: defaultConfig.rateLimiter?.enabled !== false,
			},
			// Include file operations configuration
			fileOperations: defaultConfig.fileOperations || {},
			// Include logging configuration
			logging: {
				...defaultConfig.logging,
				verbose: mergedOpts.verbose || defaultConfig.logging?.verbose || false,
			},
		};

		// Update configurations with final settings
		configureComponents(finalConfig);

		// Validate environment
		validateEnvironment();

		// Debug configuration details
		if (finalConfig.debug) {
			console.log("\n📋 Configuration details:");
			console.log(
				JSON.stringify(
					{
						...finalConfig,
						// Don't log the entire API config which may contain sensitive data
						apiConfig: Object.keys(finalConfig.apiConfig || {}),
					},
					null,
					2
				)
			);
		}

		// Display performance tips
		await displayPerformanceTips(finalConfig);

		// Find locale files
		const localesDir = path.resolve(finalConfig.localesDir);
		console.log(`\n📁 Looking for source files in: ${localesDir}`);

		const files = await findLocaleFiles(localesDir, finalConfig.source);

		if (!files || !files.length) {
			throw new Error(
				`Source language file (${finalConfig.source}.json) not found in: ${localesDir}`
			);
		}

		// Execute the command
		const startTime = Date.now();

		switch (commandName) {
			case "fix":
				console.log("\n🔧 Running in FIX mode");
				await Promise.all(
					files.map((file) => validateAndFixExistingTranslations(file, finalConfig))
				);
				break;

			case "analyze":
				console.log("\n🔍 Running in ANALYZE mode");
				console.log("Context analysis mode is not fully implemented yet.");
				break;

			case "advanced":
				console.log("\n⚙️ Running ADVANCED configuration");
			// Fall through to translate

			case "translate":
			default:
				console.log("\n🚀 Running in TRANSLATION mode");

				if (finalConfig.context.useAI) {
					console.log(
						`🧠 AI Context Analysis: ENABLED (Provider: ${finalConfig.context.aiProvider || finalConfig.apiProvider})`
					);
					if (finalConfig.context.allowNewCategories) {
						console.log("🔄 New category suggestions: ENABLED");
					}
				}

				console.log(`⚙️ Performance settings:`);
				console.log(
					`   - Concurrency: ${finalConfig.concurrencyLimit} parallel operations`
				);
				console.log(`   - Caching: ${finalConfig.cacheEnabled ? "Enabled" : "Disabled"}`);
				console.log(`   - Retries: ${finalConfig.retryOptions.maxRetries} max retries`);

				if (finalConfig.rateLimiter?.adaptiveThrottling) {
					console.log(`   - Adaptive Rate Limiting: Enabled`);
				}

				if (finalConfig.forceUpdate) {
					console.log(
						`⚠️ Force update mode: ENABLED (will update existing translations)`
					);
				}

				// Process all files
				for (const file of files) {
					await translateFile(file, finalConfig);
				}
				break;
		}

		// Calculate and display total execution time
		const executionTime = (Date.now() - startTime) / 1000;
		console.log(`\n✅ All operations completed successfully in ${executionTime.toFixed(1)}s`);
	};

	// Translate command - the default action
	program
		.command("translate")
		.description("Translate missing strings (default command)")
		.option("--provider <provider>", "Translation provider", defaultConfig.apiProvider)
		.option(
			"--concurrency <number>",
			"Number of concurrent translations",
			Number,
			defaultConfig.concurrencyLimit
		)
		.option("--no-cache", "Disable translation caching")
		.option("--force", "Force update of existing translations", false)
		.option(
			"--length <mode>",
			"Length control mode",
			defaultConfig.lengthControl?.mode || "smart"
		)
		.option("--auto-optimize", "Auto-optimize system parameters based on hardware", false)
		.option("--stats", "Show detailed stats after completion", false)
		.action(async (options) => {
			try {
				await runCommand(program.opts(), options, "translate");
			} catch (error) {
				console.error(`\n❌ Error: ${error.message}`);
				if (error.stack && process.env.DEBUG) {
					console.error(error.stack);
				}
				process.exit(1);
			}
		});

	// Fix command - for fixing existing translations
	program
		.command("fix")
		.description("Fix issues in existing translations")
		.option("--length", "Fix length issues in existing translations", true)
		.action(async (options) => {
			try {
				await runCommand(program.opts(), options, "fix");
			} catch (error) {
				console.error(`\n❌ Error: ${error.message}`);
				if (error.stack && process.env.DEBUG) {
					console.error(error.stack);
				}
				process.exit(1);
			}
		});

	// Context command - for analyzing context
	program
		.command("analyze")
		.description("Analyze context patterns")
		.option("--use-ai", "Enable AI-based context analysis", defaultConfig.context.useAI)
		.option(
			"--context-provider <provider>",
			"AI provider for analysis",
			defaultConfig.context.aiProvider
		)
		.option(
			"--context-threshold <number>",
			"Minimum match count",
			Number,
			defaultConfig.context.detection.threshold
		)
		.action(async (options) => {
			try {
				await runCommand(program.opts(), options, "analyze");
			} catch (error) {
				console.error(`\n❌ Error: ${error.message}`);
				if (error.stack && process.env.DEBUG) {
					console.error(error.stack);
				}
				process.exit(1);
			}
		});

	// Advanced options command - for rarely used, technical options
	program
		.command("advanced")
		.description("Access advanced configuration options")
		.option(
			"--context-confidence <number>",
			"Minimum confidence score",
			Number,
			defaultConfig.context.detection.minConfidence
		)
		.option("--context-debug", "Show context details", defaultConfig.context.debug)
		.option(
			"--min-text-length <number>",
			"Minimum text length for AI analysis",
			Number,
			defaultConfig.context.minTextLength
		)
		.option(
			"--allow-new-categories",
			"Allow AI to suggest new categories",
			defaultConfig.context.allowNewCategories
		)
		.option(
			"--max-retries <number>",
			"Maximum number of retries for API calls",
			Number,
			defaultConfig.retryOptions?.maxRetries || 2
		)
		.action(async (options) => {
			try {
				await runCommand(program.opts(), options, "advanced");
			} catch (error) {
				console.error(`\n❌ Error: ${error.message}`);
				if (error.stack && process.env.DEBUG) {
					console.error(error.stack);
				}
				process.exit(1);
			}
		});

	// Handle the default command (no command specified)
	program.action(async () => {
		try {
			// If no command, run translate with default options
			await runCommand(program.opts(), {}, "translate");
		} catch (error) {
			console.error(`\n❌ Error: ${error.message}`);
			if (error.stack && process.env.DEBUG) {
				console.error(error.stack);
			}
			process.exit(1);
		}
	});

	// Parse arguments
	program.parse(process.argv);

	// Return dummy config for compatibility
	return defaultConfig;
};

/**
 * Validate environment variables and configuration
 */
const validateEnvironment = () => {
	try {
		// Check that ProviderFactory can validate providers
		const availableProviders = ProviderFactory.validateProviders();

		// Log available providers
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

/**
 * Display performance optimization tips
 */
const displayPerformanceTips = async (options) => {
	// Skip if debug is not enabled
	if (!options.debug) return;

	try {
		// Check system specifications
		const cpuCount = os.cpus().length;
		const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
		const memoryGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
		const freememGB = Math.floor(os.freemem() / (1024 * 1024 * 1024));

		// Instantiate orchestrator to check cache
		const orchestrator = new Orchestrator(options);
		const cacheStats = orchestrator.getCacheStats();

		console.log("\n🚀 Performance Information:");
		console.log(`   - CPU: ${cpuModel} (${cpuCount} cores)`);
		console.log(`   - Memory: ${freememGB}GB free of ${memoryGB}GB total`);
		console.log(`   - Concurrency: ${options.concurrencyLimit} parallel operations`);
		console.log(
			`   - Cache: ${options.cacheEnabled ? "Enabled" : "Disabled"} (${cacheStats.size} items cached)`
		);

		// Provide tips
		console.log("\n💡 Performance Tips:");

		if (cpuCount > options.concurrencyLimit * 2) {
			console.log(
				`   - Increase concurrency with --concurrency ${Math.min(cpuCount, 10)} to better utilize your CPU`
			);
		}

		if (!options.cacheEnabled) {
			console.log(`   - Enable caching to improve repeated runs speed`);
		}

		if (memoryGB < 4) {
			console.log(
				`   - Your system has limited memory (${memoryGB}GB). Consider reducing concurrency if you experience issues.`
			);
		}
	} catch (error) {
		// Ignore errors in performance tips calculation
		console.log("⚠️ Could not calculate performance tips");
	}
};

/**
 * Main CLI function
 */
(async () => {
	const startTime = Date.now();

	try {
		const defaultConfig = await loadConfig();
		await configureCLI(defaultConfig);

		// The command execution now happens in the commander.js action handlers
		// Nothing to do here!
	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);
		if (error.stack && process.env.DEBUG) {
			console.error(error.stack);
		}
		process.exit(1);
	}
})();
