#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import os from "os";
import { program } from "commander";
import {
	translateFile,
	findLocaleFiles,
	validateAndFixExistingTranslations,
} from "../src/commands/translator.js";
import ProviderFactory from "../src/core/provider-factory.js";
import { FileManager } from "../src/utils/file-manager.js";
import rateLimiter from "../src/utils/rate-limiter.js";
import Orchestrator from "../src/core/orchestrator.js";
import InputValidator from "../src/utils/input-validator.js";
import gracefulShutdown from "../src/utils/graceful-shutdown.js";

const loadEnvironmentVariables = async () => {
	return Promise.resolve();
};

const loadConfig = async () => {
	try {
		const configPaths = [
			path.resolve(process.cwd(), "localize.config.js"),
			path.resolve(process.cwd(), "localize.config.cjs"),
			path.resolve(process.cwd(), "../localize.config.js"),
			path.resolve(process.cwd(), "../localize.config.cjs"),
			path.resolve(process.cwd(), "../../localize.config.js"),
			path.resolve(process.cwd(), "../../localize.config.cjs"),
		];

		let configFile = null;
		for (const configPath of configPaths) {
			try {
				await fs.access(configPath);
				configFile = configPath;
				break;
			} catch (e) {}
		}

		if (!configFile) {
			throw new Error("Config file not found in working directory or parent directories");
		}

		console.log(`🔍 Loading config from: ${path.relative(process.cwd(), configFile)}`);

		try {
			// Use dynamic import for ESM
			const configUrl = `file://${configFile.replace(/\\/g, "/")}?t=${Date.now()}`;
			const configModule = await import(configUrl);
			const config = configModule.default || configModule;

			if (!config || typeof config !== "object") {
				throw new Error("Config file does not export a valid configuration object");
			}

			return config;
		} catch (importError) {
			console.warn(`⚠️ Both CommonJS and ES module loading failed: ${importError.message}`);
			throw importError;
		}
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

const configureComponents = (config) => {
	if (config.fileOperations) {
		FileManager.configure(config.fileOperations);
	}

	if (config.rateLimiter) {
		rateLimiter.updateConfig({
			queueStrategy: config.rateLimiter.queueStrategy || "priority",
			queueTimeout: config.rateLimiter.queueTimeout || 30000,
			adaptiveThrottling: config.rateLimiter.adaptiveThrottling !== false,
			providerLimits: config.rateLimiter.providerLimits,
		});
	}

	if (config.advanced?.debug) {
		process.env.DEBUG = "true";
	}

	if (config.logging?.verbose) {
		process.env.VERBOSE = "true";
	}
};

const configureCLI = async (defaultConfig) => {
	configureComponents(defaultConfig);

	program
		.name("localize")
		.description("AI-powered localization tool for Next.js projects")
		.version("1.0.0");

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

	program.on("option:debug", function () {
		process.env.DEBUG = "true";
		console.log("🔍 Debug mode: ENABLED (verbose logging)");
	});

	program.on("option:verbose", function () {
		process.env.VERBOSE = "true";
		console.log("🔍 Verbose mode: ENABLED (detailed diagnostics)");
	});

	const runCommand = async (options, commandOptions, commandName) => {
		try {
			const validCommands = ["translate", "fix", "analyze", "advanced"];
			if (!validCommands.includes(commandName)) {
				throw new Error(`Invalid command: ${commandName}`);
			}

			const globalOpts = program.opts();

			if (globalOpts.debug) {
				const safeGlobalOpts = { ...globalOpts };
				const safeCommandOptions = { ...commandOptions };

				if (safeGlobalOpts.targets) {
					safeGlobalOpts.targets = `[${safeGlobalOpts.targets.length} languages]`;
				}
				if (safeGlobalOpts.localesDir) {
					safeGlobalOpts.localesDir = "[directory_path]";
				}
				if (safeCommandOptions.provider) {
					safeCommandOptions.provider = "[provider_name]";
				}

				console.log("CLI Command:", commandName);
				console.log("Global Options:", JSON.stringify(safeGlobalOpts, null, 2));
				console.log("Command Options:", JSON.stringify(safeCommandOptions, null, 2));
			}

			const sanitizedGlobalOpts = { ...globalOpts };
			const sanitizedCommandOptions = { ...commandOptions };

			if (sanitizedGlobalOpts.source) {
				sanitizedGlobalOpts.source = InputValidator.validateLanguageCode(
					sanitizedGlobalOpts.source,
					"source language"
				);
			}

			if (sanitizedGlobalOpts.targets && Array.isArray(sanitizedGlobalOpts.targets)) {
				sanitizedGlobalOpts.targets = InputValidator.validateLanguageCodes(
					sanitizedGlobalOpts.targets,
					"target languages"
				);
			}

			if (sanitizedGlobalOpts.localesDir) {
				sanitizedGlobalOpts.localesDir = InputValidator.validateDirectoryPath(
					sanitizedGlobalOpts.localesDir,
					"locales directory"
				);
			}

			if (sanitizedCommandOptions.provider) {
				sanitizedCommandOptions.provider = InputValidator.validateProvider(
					sanitizedCommandOptions.provider,
					"API provider"
				);
			}

			if (sanitizedCommandOptions.concurrency !== undefined) {
				const concurrency = parseInt(sanitizedCommandOptions.concurrency);
				if (isNaN(concurrency) || concurrency < 1 || concurrency > 20) {
					throw new Error("Concurrency must be a number between 1 and 20");
				}
				sanitizedCommandOptions.concurrency = concurrency;
			}

			if (sanitizedCommandOptions.contextThreshold !== undefined) {
				const threshold = parseInt(sanitizedCommandOptions.contextThreshold);
				if (isNaN(threshold) || threshold < 1 || threshold > 10) {
					throw new Error("Context threshold must be a number between 1 and 10");
				}
				sanitizedCommandOptions.contextThreshold = threshold;
			}

			if (sanitizedCommandOptions.contextConfidence !== undefined) {
				const confidence = parseFloat(sanitizedCommandOptions.contextConfidence);
				if (isNaN(confidence) || confidence < 0 || confidence > 1) {
					throw new Error("Context confidence must be a number between 0 and 1");
				}
				sanitizedCommandOptions.contextConfidence = confidence;
			}

			if (sanitizedCommandOptions.length) {
				const validLengthModes = ["strict", "flexible", "exact", "relaxed", "smart"];
				if (!validLengthModes.includes(sanitizedCommandOptions.length)) {
					throw new Error(
						`Invalid length mode: ${sanitizedCommandOptions.length}. Valid modes: ${validLengthModes.join(", ")}`
					);
				}
			}

			const mergedOpts = {
				source: defaultConfig.source,
				targets: defaultConfig.targets,
				localesDir: defaultConfig.localesDir,
				apiProvider: defaultConfig.apiProvider,
				...(sanitizedGlobalOpts.source && { source: sanitizedGlobalOpts.source }),
				...(sanitizedGlobalOpts.targets && { targets: sanitizedGlobalOpts.targets }),
				...(sanitizedGlobalOpts.localesDir && {
					localesDir: sanitizedGlobalOpts.localesDir,
				}),
				...sanitizedCommandOptions,
			};

			let concurrencyLimit =
				parseInt(mergedOpts.concurrency) || defaultConfig.concurrencyLimit || 5;

			if (mergedOpts.autoOptimize) {
				const cpuCount = os.cpus().length;
				const memoryGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));

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

			if (concurrencyLimit < 1 || concurrencyLimit > 20) {
				throw new Error("Invalid concurrency limit after optimization");
			}

			const finalConfig = {
				...defaultConfig,
				command: commandName,
				source: mergedOpts.source,
				targets: mergedOpts.targets,
				localesDir: mergedOpts.localesDir,
				apiProvider: mergedOpts.provider || defaultConfig.apiProvider,
				concurrencyLimit: concurrencyLimit,
				cacheEnabled:
					mergedOpts.noCache === undefined
						? defaultConfig.cacheEnabled
						: !mergedOpts.noCache,
				debug: mergedOpts.debug,
				verbose: mergedOpts.verbose || defaultConfig.logging?.verbose || false,
				forceUpdate: mergedOpts.force || false,
				showDetailedStats: mergedOpts.stats || false,
				autoOptimize:
					mergedOpts.autoOptimize || defaultConfig.advanced?.autoOptimize || false,
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
					maxRetries:
						mergedOpts.maxRetries || defaultConfig.retryOptions?.maxRetries || 2,
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

				advanced: {
					...defaultConfig.advanced,
					timeoutMs: mergedOpts.timeout || defaultConfig.advanced?.timeoutMs || 60000,
					maxKeyLength: defaultConfig.advanced?.maxKeyLength || 10000,
					maxBatchSize: defaultConfig.advanced?.maxBatchSize || 50,
					autoOptimize:
						mergedOpts.autoOptimize || defaultConfig.advanced?.autoOptimize || false,
					debug: mergedOpts.debug || defaultConfig.advanced?.debug || false,
				},

				rateLimiter: {
					...defaultConfig.rateLimiter,
					enabled: defaultConfig.rateLimiter?.enabled !== false,
				},

				fileOperations: defaultConfig.fileOperations || {},

				logging: {
					...defaultConfig.logging,
					verbose: mergedOpts.verbose || defaultConfig.logging?.verbose || false,
				},
			};

			try {
				InputValidator.validateConfig(finalConfig);
			} catch (configError) {
				throw new Error(`Configuration validation failed: ${configError.message}`);
			}

			configureComponents(finalConfig);

			validateEnvironment();

			if (finalConfig.debug) {
				console.log("\n📋 Configuration details:");

				const safeConfig = {
					...finalConfig,
					apiConfig: Object.keys(finalConfig.apiConfig || {}).reduce((acc, provider) => {
						acc[provider] = {
							model: finalConfig.apiConfig[provider]?.model || "configured",
							temperature: finalConfig.apiConfig[provider]?.temperature,
							maxTokens: finalConfig.apiConfig[provider]?.maxTokens,
						};
						return acc;
					}, {}),
					advanced: {
						...finalConfig.advanced,
						timeoutMs: finalConfig.advanced?.timeoutMs,
						maxKeyLength: finalConfig.advanced?.maxKeyLength,
						maxBatchSize: finalConfig.advanced?.maxBatchSize,
						autoOptimize: finalConfig.advanced?.autoOptimize,
						debug: finalConfig.advanced?.debug,
					},
				};

				delete safeConfig.apiProvider; // Could leak preferred provider info
				delete safeConfig.localesDir; // Could leak file system structure

				console.log(JSON.stringify(safeConfig, null, 2));
			}

			await displayPerformanceTips(finalConfig);

			const localesDir = path.resolve(finalConfig.localesDir);
			console.log(`\n📁 Looking for source files in: ${localesDir}`);

			const files = await findLocaleFiles(localesDir, finalConfig.source);

			if (!files || !files.length) {
				throw new Error(
					`Source language file (${finalConfig.source}.json) not found in: ${localesDir}`
				);
			}

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
					console.log(
						`   - Caching: ${finalConfig.cacheEnabled ? "Enabled" : "Disabled"}`
					);
					console.log(`   - Retries: ${finalConfig.retryOptions.maxRetries} max retries`);

					if (finalConfig.rateLimiter?.adaptiveThrottling) {
						console.log(`   - Adaptive Rate Limiting: Enabled`);
					}

					if (finalConfig.forceUpdate) {
						console.log(
							`⚠️ Force update mode: ENABLED (will update existing translations)`
						);
					}

					for (const file of files) {
						await translateFile(file, finalConfig);
					}
					break;
			}

			// Translation command exits within translateFile with process.exit(0),
			// so this completion message won't be reached for translate mode.
			// Keep it only for other modes that don't have their own exit handling.
		} catch (validationError) {
			console.error(`\n❌ Input validation error: ${validationError.message}`);
			process.exit(1);
		}
	};

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

	program.action(async () => {
		try {
			await runCommand(program.opts(), {}, "translate");
		} catch (error) {
			console.error(`\n❌ Error: ${error.message}`);
			if (error.stack && process.env.DEBUG) {
				console.error(error.stack);
			}
			process.exit(1);
		}
	});

	program.parse(process.argv);

	return defaultConfig;
};

const validateEnvironment = () => {
	try {
		// Check that ProviderFactory can validate providers
		const availableProviders = ProviderFactory.validateProviders();

		console.log(`\n🔑 Available API providers: ${availableProviders.join(", ")}`);

		return availableProviders;
	} catch (error) {
		console.error("\n❌ Error: " + error.message);
		console.error("Please set at least one of the following environment variables:");

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

const displayPerformanceTips = async (options) => {
	if (!options.debug) return;

	try {
		const cpuCount = os.cpus().length;
		const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
		const memoryGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
		const freememGB = Math.floor(os.freemem() / (1024 * 1024 * 1024));

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
		console.log("⚠️ Could not calculate performance tips");
	}
};

// Top-level await - no IIFE needed in ESM!
const startTime = Date.now();

try {
	await loadEnvironmentVariables();
	const defaultConfig = await loadConfig();
	await configureCLI(defaultConfig);
} catch (error) {
	console.error(`\n❌ Error: ${error.message}`);
	if (error.stack && process.env.DEBUG) {
		console.error(error.stack);
	}
	process.exit(1);
}
