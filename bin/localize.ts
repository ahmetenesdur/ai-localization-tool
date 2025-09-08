#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as path from "path";
import { promises as fs } from "fs";
import { program } from "commander";

// Load environment variables
dotenv.config();

import ProviderFactory from "@/core/provider-factory";
import { FileManager } from "@/utils/file-manager";
import rateLimiter from "@/utils/rate-limiter";
import gracefulShutdown from "@/utils/graceful-shutdown";
import {
	translateFile,
	validateAndFixExistingTranslations,
	findLocaleFiles,
} from "@/commands/translator";
import type { LocalizationConfig, CommandOptions } from "@/types";
import { DEFAULT_LOCALIZATION_CONFIG } from "@/config/defaults";

// Define CLI options interface
interface CLIOptions {
	[key: string]: any;
	source?: string;
	targets?: string[];
	localesDir?: string;
	debug?: boolean;
	verbose?: boolean;
}

// Load environment variables from .env.local file
const envLocalPath = path.resolve(process.cwd(), ".env.local");
try {
	dotenv.config({ path: envLocalPath });
} catch (error) {
	console.warn(`⚠️ Could not load .env.local file from ${envLocalPath}`);
}

/**
 * Load configuration from localize.config.js or localize.config.ts
 */
const loadConfig = async (): Promise<LocalizationConfig> => {
	try {
		const configPaths = [
			path.resolve(process.cwd(), "localize.config.js"),
			path.resolve(process.cwd(), "localize.config.ts"),
			path.resolve(process.cwd(), "localize.config.cjs"),
			path.resolve(process.cwd(), "../localize.config.js"),
			path.resolve(process.cwd(), "../localize.config.ts"),
			path.resolve(process.cwd(), "../localize.config.cjs"),
		];

		let configFile: string | null = null;
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

		// Load using dynamic import for better type safety
		const configModule = await import(configFile);

		// Handle both default export and direct export
		const configToUse = configModule.default || configModule;

		if (!configToUse || typeof configToUse !== "object") {
			throw new Error("Config file does not export a valid configuration object");
		}

		return configToUse as LocalizationConfig;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		console.warn(`⚠️ Could not load config file: ${errorMessage}`);

		// Return default configuration
		return DEFAULT_LOCALIZATION_CONFIG;
	}
};

/**
 * Configure components based on config
 */
const configureComponents = (config: LocalizationConfig): void => {
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
			providerLimits: config.rateLimiter.providerLimits,
		});
	}

	// Configure environment variables
	if (config.advanced?.debug) {
		process.env.DEBUG = "true";
	}

	if (config.logging?.verbose) {
		process.env.VERBOSE = "true";
	}
};

/**
 * Configure CLI program
 */
const configureCLI = async (defaultConfig: LocalizationConfig): Promise<void> => {
	configureComponents(defaultConfig);

	program
		.name("localize")
		.description("AI-powered localization tool for Next.js projects")
		.version("1.5.0");

	// Common global options
	program
		.option("-s, --source <lang>", "Source language", defaultConfig.source)
		.option(
			"-t, --targets <langs>",
			"Target languages (comma separated)",
			(val: string) => val.split(","),
			defaultConfig.targets
		)
		.option("--localesDir <dir>", "Localization files directory", defaultConfig.localesDir)
		.option("--debug", "Enable debug mode with verbose logging", false)
		.option("--verbose", "Enable detailed diagnostic output", false);

	// Handle debug mode
	program.on("option:debug", function () {
		process.env.DEBUG = "true";
		console.log("🔍 Debug mode: ENABLED (verbose logging)");
	});

	// Handle verbose mode
	program.on("option:verbose", function () {
		process.env.VERBOSE = "true";
		console.log("🔍 Verbose mode: ENABLED (detailed diagnostics)");
	});

	// Run helper for all commands
	const runCommand = async (
		options: CLIOptions,
		commandOptions: any,
		commandName: string
	): Promise<void> => {
		try {
			const validCommands = ["translate", "fix"];
			if (!validCommands.includes(commandName)) {
				throw new Error(`Invalid command: ${commandName}`);
			}

			// Merge configuration with CLI options
			const mergedConfig: LocalizationConfig = {
				...defaultConfig,
				source: options.source || defaultConfig.source,
				targets:
					options.targets && options.targets.length > 0
						? options.targets
						: defaultConfig.targets,
				localesDir: options.localesDir || defaultConfig.localesDir,
				advanced: {
					...defaultConfig.advanced,
					debug: options.debug || defaultConfig.advanced?.debug || false,
				},
				logging: {
					...defaultConfig.logging,
					verbose: options.verbose || defaultConfig.logging?.verbose || false,
				},
				...commandOptions,
			};

			// Validate configuration
			if (!mergedConfig.targets || mergedConfig.targets.length === 0) {
				throw new Error(
					"No target languages specified. Use -t option or set targets in config file."
				);
			}

			// Validate API providers
			try {
				ProviderFactory.validateProviders();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				console.error(`❌ Provider validation failed: ${errorMessage}`);
				process.exit(1);
			}

			// Find locale files
			const localeFiles = await findLocaleFiles(mergedConfig.localesDir, mergedConfig.source);
			if (localeFiles.length === 0) {
				throw new Error(
					`No source file found for language '${mergedConfig.source}' in ${mergedConfig.localesDir}`
				);
			}

			console.log(`📁 Found ${localeFiles.length} source file(s)`);

			// Execute command
			for (const file of localeFiles) {
				if (commandName === "translate") {
					await translateFile(file, mergedConfig);
				} else if (commandName === "fix") {
					await validateAndFixExistingTranslations(file, mergedConfig);
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			console.error(`❌ ${commandName} failed: ${errorMessage}`);
			process.exit(1);
		}
	};

	// Translate command
	program
		.command("translate")
		.description("Translate locale files")
		.option("--provider <provider>", "AI provider to use")
		.option("--concurrency <num>", "Concurrent translations limit", parseInt)
		.option("--force", "Force update existing translations")
		.option("--stats", "Show detailed statistics")
		.action(async (cmdOptions) => {
			const options = program.opts();
			await runCommand(options, cmdOptions, "translate");
		});

	// Fix command
	program
		.command("fix")
		.description("Validate and fix existing translations")
		.option("--length <mode>", "Length control mode: strict, flexible, smart", "smart")
		.action(async (cmdOptions) => {
			const options = program.opts();
			await runCommand(options, cmdOptions, "fix");
		});

	// Default command (translate)
	program.action(async () => {
		const options = program.opts();
		await runCommand(options, {}, "translate");
	});
};

/**
 * Main entry point
 */
async function main(): Promise<void> {
	try {
		console.log("🚀 AI Localization Tool v1.5.0");
		console.log("Loading configuration...\n");

		const config = await loadConfig();
		await configureCLI(config);

		await program.parseAsync(process.argv);

		// Ensure proper shutdown after all operations complete
		await gracefulShutdown.shutdown(0);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		console.error(`❌ Fatal error: ${errorMessage}`);
		await gracefulShutdown.shutdown(1);
	}
}

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\n👋 Shutting down gracefully...");
	gracefulShutdown.shutdown(0);
});

process.on("SIGTERM", () => {
	console.log("\n👋 Shutting down gracefully...");
	gracefulShutdown.shutdown(0);
});

// Run the CLI
if (require.main === module) {
	main().catch((error) => {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		console.error(`❌ Unhandled error: ${errorMessage}`);
		gracefulShutdown.shutdown(1);
	});
}
