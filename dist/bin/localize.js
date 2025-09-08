#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
const commander_1 = require("commander");
const translator_1 = require("../src/commands/translator");
const provider_factory_1 = __importDefault(require("../src/core/provider-factory"));
const file_manager_1 = require("../src/utils/file-manager");
const rate_limiter_1 = __importDefault(require("../src/utils/rate-limiter"));
const graceful_shutdown_1 = __importDefault(require("../src/utils/graceful-shutdown"));
// Load environment variables from .env.local file
const envLocalPath = path.resolve(process.cwd(), ".env.local");
try {
    dotenv.config({ path: envLocalPath });
}
catch (error) {
    console.warn(`⚠️ Could not load .env.local file from ${envLocalPath}`);
}
/**
 * Load configuration from localize.config.js or localize.config.ts
 */
const loadConfig = async () => {
    try {
        const configPaths = [
            path.resolve(process.cwd(), "localize.config.js"),
            path.resolve(process.cwd(), "localize.config.ts"),
            path.resolve(process.cwd(), "localize.config.cjs"),
            path.resolve(process.cwd(), "../localize.config.js"),
            path.resolve(process.cwd(), "../localize.config.ts"),
            path.resolve(process.cwd(), "../localize.config.cjs"),
        ];
        let configFile = null;
        for (const configPath of configPaths) {
            try {
                await fs_1.promises.access(configPath);
                configFile = configPath;
                break;
            }
            catch (e) {
                // File doesn't exist, try next path
            }
        }
        if (!configFile) {
            throw new Error("Config file not found in working directory or parent directories");
        }
        console.log(`🔍 Loading config from: ${path.relative(process.cwd(), configFile)}`);
        // Load using require (CommonJS) - works for both .js and .ts when compiled
        const config = require(configFile);
        // Handle both default export and direct export
        const configToUse = config.default || config;
        if (!configToUse || typeof configToUse !== "object") {
            throw new Error("Config file does not export a valid configuration object");
        }
        return configToUse;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.warn(`⚠️ Could not load config file: ${errorMessage}`);
        // Return default configuration
        return {
            version: "1.0.0",
            source: "en",
            targets: [],
            localesDir: "./locales",
            apiProvider: "deepseek",
            useFallback: true,
            fallbackOrder: ["deepseek", "openai", "gemini"],
            apiConfig: {
                deepseek: {
                    model: "deepseek-chat",
                    temperature: 0.1,
                    maxTokens: 2000,
                    contextWindow: 8000,
                },
                openai: {
                    model: "gpt-4o-mini",
                    temperature: 0.3,
                    maxTokens: 2000,
                    contextWindow: 16000,
                },
                gemini: {
                    model: "gemini-2.5-flash-lite",
                    temperature: 0.3,
                    maxTokens: 2000,
                    contextWindow: 16000,
                },
                dashscope: {
                    model: "qwen-plus",
                    temperature: 0.3,
                    maxTokens: 2000,
                    contextWindow: 8000,
                },
                xai: {
                    model: "grok-2-1212",
                    temperature: 0.3,
                    maxTokens: 2000,
                    contextWindow: 8000,
                },
            },
            concurrencyLimit: 5,
            cacheEnabled: true,
            cacheTTL: 24 * 60 * 60 * 1000,
            cacheSize: 1000,
            rateLimiter: {
                enabled: true,
                providerLimits: {
                    openai: { rpm: 300, concurrency: 5 },
                    deepseek: { rpm: 30, concurrency: 2 },
                    gemini: { rpm: 300, concurrency: 5 },
                    dashscope: { rpm: 80, concurrency: 6 },
                    xai: { rpm: 80, concurrency: 8 },
                },
                queueStrategy: "priority",
                adaptiveThrottling: true,
                queueTimeout: 30000,
            },
            retryOptions: {
                maxRetries: 2,
                initialDelay: 1000,
                maxDelay: 10000,
                jitter: true,
                retryableErrors: ["rate_limit", "timeout", "network", "server", "unknown"],
                perProviderRetry: {},
            },
            context: {
                enabled: true,
                useAI: false,
                aiProvider: "openai",
                minTextLength: 50,
                allowNewCategories: true,
                debug: false,
                analysisOptions: {
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    maxTokens: 1000,
                },
                detection: {
                    threshold: 2,
                    minConfidence: 0.6,
                },
                categories: {
                    technical: {
                        keywords: ["API", "backend", "database", "server"],
                        prompt: "Preserve technical terms",
                        weight: 1.3,
                    },
                    marketing: {
                        keywords: ["brand", "campaign", "customer"],
                        prompt: "Use engaging language",
                        weight: 1.1,
                    },
                },
                fallback: {
                    category: "general",
                    prompt: "Provide a natural translation",
                },
            },
            qualityChecks: {
                enabled: true,
                rules: {
                    placeholderConsistency: true,
                    htmlTagsConsistency: true,
                    punctuationCheck: true,
                    lengthValidation: true,
                    sanitizeOutput: true,
                    markdownPreservation: true,
                    specialCharacters: true,
                    codeBlockPreservation: true,
                },
                autoFix: true,
            },
            styleGuide: {
                formality: "neutral",
                toneOfVoice: "professional",
                conventions: {
                    useOxfordComma: true,
                    useSentenceCase: true,
                },
            },
            lengthControl: {
                mode: "smart",
                rules: {
                    strict: 0.1,
                    flexible: 0.3,
                    exact: 0.05,
                    relaxed: 0.5,
                    smart: {
                        default: 0.15,
                        byLanguage: {},
                        byContext: {},
                    },
                },
            },
            fileOperations: {
                atomic: true,
                createMissingDirs: true,
                backupFiles: false,
                backupDir: "./backups",
                encoding: "utf8",
                jsonIndent: 2,
            },
            logging: {
                verbose: false,
                diagnosticsLevel: "normal",
                outputFormat: "pretty",
                saveErrorLogs: true,
                logDirectory: "./logs",
                includeTimestamps: true,
                logRotation: {
                    enabled: true,
                    maxFiles: 5,
                    maxSize: "10MB",
                },
            },
            syncOptions: {
                enabled: true,
                removeDeletedKeys: true,
                retranslateModified: true,
                backupBeforeSync: false,
            },
            advanced: {
                timeoutMs: 30000,
                maxKeyLength: 10000,
                maxBatchSize: 50,
                autoOptimize: true,
                debug: false,
            },
        };
    }
};
/**
 * Configure components based on config
 */
const configureComponents = (config) => {
    // Configure file operations
    if (config.fileOperations) {
        file_manager_1.FileManager.configure(config.fileOperations);
    }
    // Configure rate limiter
    if (config.rateLimiter) {
        rate_limiter_1.default.updateConfig({
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
const configureCLI = async (defaultConfig) => {
    configureComponents(defaultConfig);
    commander_1.program
        .name("localize")
        .description("AI-powered localization tool for Next.js projects")
        .version("1.5.0");
    // Common global options
    commander_1.program
        .option("-s, --source <lang>", "Source language", defaultConfig.source)
        .option("-t, --targets <langs>", "Target languages (comma separated)", (val) => val.split(","), defaultConfig.targets)
        .option("--localesDir <dir>", "Localization files directory", defaultConfig.localesDir)
        .option("--debug", "Enable debug mode with verbose logging", false)
        .option("--verbose", "Enable detailed diagnostic output", false);
    // Handle debug mode
    commander_1.program.on("option:debug", function () {
        process.env.DEBUG = "true";
        console.log("🔍 Debug mode: ENABLED (verbose logging)");
    });
    // Handle verbose mode
    commander_1.program.on("option:verbose", function () {
        process.env.VERBOSE = "true";
        console.log("🔍 Verbose mode: ENABLED (detailed diagnostics)");
    });
    // Run helper for all commands
    const runCommand = async (options, commandOptions, commandName) => {
        try {
            const validCommands = ["translate", "fix", "analyze"];
            if (!validCommands.includes(commandName)) {
                throw new Error(`Invalid command: ${commandName}`);
            }
            // Merge configuration with CLI options
            const mergedConfig = {
                ...defaultConfig,
                source: options.source || defaultConfig.source,
                targets: options.targets && options.targets.length > 0
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
                throw new Error("No target languages specified. Use -t option or set targets in config file.");
            }
            // Validate API providers
            try {
                provider_factory_1.default.validateProviders();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error(`❌ Provider validation failed: ${errorMessage}`);
                process.exit(1);
            }
            // Find locale files
            const localeFiles = await (0, translator_1.findLocaleFiles)(mergedConfig.localesDir, mergedConfig.source);
            if (localeFiles.length === 0) {
                throw new Error(`No source file found for language '${mergedConfig.source}' in ${mergedConfig.localesDir}`);
            }
            console.log(`📁 Found ${localeFiles.length} source file(s)`);
            // Execute command
            for (const file of localeFiles) {
                if (commandName === "translate") {
                    await (0, translator_1.translateFile)(file, mergedConfig);
                }
                else if (commandName === "fix") {
                    await (0, translator_1.validateAndFixExistingTranslations)(file, mergedConfig);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`❌ ${commandName} failed: ${errorMessage}`);
            process.exit(1);
        }
    };
    // Translate command
    commander_1.program
        .command("translate")
        .description("Translate locale files")
        .option("--provider <provider>", "AI provider to use")
        .option("--concurrency <num>", "Concurrent translations limit", parseInt)
        .option("--force", "Force update existing translations")
        .option("--stats", "Show detailed statistics")
        .action(async (cmdOptions) => {
        const options = commander_1.program.opts();
        await runCommand(options, cmdOptions, "translate");
    });
    // Fix command
    commander_1.program
        .command("fix")
        .description("Validate and fix existing translations")
        .option("--length <mode>", "Length control mode: strict, flexible, smart", "smart")
        .action(async (cmdOptions) => {
        const options = commander_1.program.opts();
        await runCommand(options, cmdOptions, "fix");
    });
    // Default command (translate)
    commander_1.program.action(async () => {
        const options = commander_1.program.opts();
        await runCommand(options, {}, "translate");
    });
};
/**
 * Main entry point
 */
async function main() {
    try {
        console.log("🚀 AI Localization Tool v1.5.0");
        console.log("Loading configuration...\n");
        const config = await loadConfig();
        await configureCLI(config);
        await commander_1.program.parseAsync(process.argv);
        // Ensure proper shutdown after all operations complete
        await graceful_shutdown_1.default.shutdown(0);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Fatal error: ${errorMessage}`);
        await graceful_shutdown_1.default.shutdown(1);
    }
}
// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\n👋 Shutting down gracefully...");
    graceful_shutdown_1.default.shutdown(0);
});
process.on("SIGTERM", () => {
    console.log("\n👋 Shutting down gracefully...");
    graceful_shutdown_1.default.shutdown(0);
});
// Run the CLI
if (require.main === module) {
    main().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Unhandled error: ${errorMessage}`);
        graceful_shutdown_1.default.shutdown(1);
    });
}
//# sourceMappingURL=localize.js.map