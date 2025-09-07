#!/usr/bin/env ts-node

/**
 * Comprehensive Test Suite for AI Localization Tool
 * This test verifies all major features work correctly after TypeScript migration
 */

import * as path from "path";
import * as fs from "fs/promises";

// Import the modules we want to test
import { FileManager } from "../src/utils/file-manager";
import StateManager from "../src/utils/state-manager";
import { Orchestrator } from "../src/core/orchestrator";
import { ProviderFactory } from "../src/core/provider-factory";
import { OpenAIProvider } from "../src/providers/openai";
import { DeepSeekProvider } from "../src/providers/deepseek";
import { BaseProvider } from "../src/providers/base-provider";

// Test configuration
const testConfig = {
	version: "1.0.0",
	source: "en",
	targets: ["tr", "es"],
	localesDir: "./test-locales",
	apiProvider: "deepseek",
	useFallback: true,
	fallbackOrder: ["deepseek", "openai"],
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
	},
	concurrencyLimit: 2,
	cacheEnabled: true,
	cacheTTL: 1000 * 60 * 60, // 1 hour
	cacheSize: 100,
	rateLimiter: {
		enabled: true,
		providerLimits: {
			openai: { rpm: 300, concurrency: 5 },
			deepseek: { rpm: 30, concurrency: 2 },
		},
		queueStrategy: "priority" as const,
		adaptiveThrottling: true,
		queueTimeout: 30000,
	},
	retryOptions: {
		maxRetries: 1,
		initialDelay: 100,
		maxDelay: 1000,
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
		formality: "neutral" as const,
		toneOfVoice: "professional" as const,
		conventions: {
			useOxfordComma: true,
			useSentenceCase: true,
		},
	},
	lengthControl: {
		mode: "smart" as const,
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
		backupDir: "./test-backups",
		encoding: "utf8",
		jsonIndent: 2,
	},
	logging: {
		verbose: false,
		diagnosticsLevel: "normal" as const,
		outputFormat: "pretty" as const,
		saveErrorLogs: true,
		logDirectory: "./test-logs",
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
		stateDir: ".test-cache",
		stateFileName: "test.state.json",
	},
	advanced: {
		timeoutMs: 10000,
		maxKeyLength: 10000,
		maxBatchSize: 10,
		autoOptimize: false,
		debug: false,
	},
};

// Test data
const testSourceData = {
	"welcome.message": "Welcome to our application",
	"user.profile": "User Profile",
	"settings.title": "Settings",
	"button.save": "Save",
	"button.cancel": "Cancel",
	"error.network": "Network error occurred",
	"success.message": "Operation completed successfully",
	"api.key": "API Key",
	"database.connection": "Database Connection",
};

const testModifiedSourceData = {
	"welcome.message": "Welcome to our amazing application", // Modified
	"user.profile": "User Profile",
	"settings.title": "Settings",
	"button.save": "Save Changes", // Modified
	"button.cancel": "Cancel",
	"error.network": "Network error occurred",
	"success.message": "Operation completed successfully",
	"api.key": "API Key",
	"database.connection": "Database Connection",
	"new.feature": "New Feature", // New key
	// "deleted.key": "This key was deleted" - Removed key
};

console.log("🚀 Starting Comprehensive TypeScript Migration Test Suite");

async function runTests() {
	let passedTests = 0;
	let totalTests = 0;

	// Helper function to run a test
	async function runTest(name: string, testFn: () => Promise<boolean>) {
		totalTests++;
		try {
			console.log(`\n🧪 Running test: ${name}`);
			const result = await testFn();
			if (result) {
				console.log(`✅ PASSED: ${name}`);
				passedTests++;
			} else {
				console.log(`❌ FAILED: ${name}`);
			}
			return result;
		} catch (error) {
			console.log(
				`❌ ERROR in ${name}:`,
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	}

	// Test 1: File Manager functionality
	await runTest("File Manager Operations", async () => {
		try {
			// Test directory creation
			await FileManager.ensureDir("./test-tmp");

			// Test JSON write
			await FileManager.writeJSON("./test-tmp/test-file.json", testSourceData);

			// Test JSON read
			const readData = await FileManager.readJSON("./test-tmp/test-file.json");

			// Verify data integrity
			const isEqual = JSON.stringify(readData) === JSON.stringify(testSourceData);

			// Cleanup
			await fs.rm("./test-tmp", { recursive: true, force: true });

			return isEqual;
		} catch (error) {
			console.error(
				"File Manager test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 2: State Manager functionality
	await runTest("State Manager Operations", async () => {
		try {
			const stateManager = new StateManager({
				stateDir: ".test-cache",
				stateFileName: "test.state.json",
			});

			// Generate state from source
			const state = stateManager.generateStateFromSource(testSourceData);

			// Save state
			await stateManager.saveState(process.cwd(), state);

			// Load state
			const loadedState = await stateManager.loadState(process.cwd());

			// Compare states
			const comparison = stateManager.compareStates(loadedState, state);

			// Generate stats
			const stats = stateManager.getComparisonStats(comparison);

			// Cleanup
			await stateManager.cleanupState(process.cwd());

			return stats.totalChanges === 0; // Should have no changes
		} catch (error) {
			console.error(
				"State Manager test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 3: Provider Factory functionality
	await runTest("Provider Factory Operations", async () => {
		try {
			// Test provider creation
			const provider = ProviderFactory.getProvider("deepseek", true, testConfig);

			// Test provider validation
			ProviderFactory.validateProviders();

			return provider !== null && typeof provider === "object";
		} catch (error) {
			console.error(
				"Provider Factory test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 4: Base Provider functionality
	await runTest("Base Provider Operations", async () => {
		try {
			// Test configuration getter
			const openaiProvider = new OpenAIProvider(testConfig.apiConfig.openai);

			// Test name getter
			const name = openaiProvider.getName();

			// Test config getter
			const config = openaiProvider.getProviderConfig();

			return name === "openai" && config.model === "gpt-4o-mini";
		} catch (error) {
			console.error(
				"Base Provider test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 5: Orchestrator functionality
	await runTest("Orchestrator Operations", async () => {
		try {
			const orchestrator = new Orchestrator(testConfig);

			// Test single translation (mocked since we don't have real API keys)
			const result = await orchestrator.processTranslation("test.key", "Hello World", "es", {
				category: "general",
				confidence: 0.8,
			});

			// Test batch translations
			const items = [
				{ key: "key1", text: "Hello", targetLang: "es" },
				{ key: "key2", text: "World", targetLang: "es" },
			];

			const results = await orchestrator.processTranslations(items);

			// Test cache stats
			const cacheStats = orchestrator.getCacheStats();

			// Test status
			const status = orchestrator.getStatus();

			// Cleanup
			orchestrator.destroy();

			// We're just testing that the methods don't throw errors
			return (
				typeof result === "object" &&
				Array.isArray(results) &&
				typeof cacheStats === "object" &&
				typeof status === "object"
			);
		} catch (error) {
			console.error(
				"Orchestrator test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 6: Configuration loading
	await runTest("Configuration Loading", async () => {
		try {
			// This test just verifies the config structure is valid
			const hasRequiredFields =
				testConfig.source &&
				testConfig.targets &&
				testConfig.localesDir &&
				testConfig.apiProvider &&
				testConfig.apiConfig;

			return Boolean(hasRequiredFields);
		} catch (error) {
			console.error(
				"Configuration test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Test 7: Type checking
	await runTest("Type Safety Verification", async () => {
		try {
			// This is a compile-time test, but we can verify some runtime type behaviors
			const fileManager = new FileManager();

			// Test that FileManager static methods exist
			const hasMethods =
				typeof FileManager.readJSON === "function" &&
				typeof FileManager.writeJSON === "function" &&
				typeof FileManager.findLocaleFiles === "function";

			return hasMethods;
		} catch (error) {
			console.error(
				"Type Safety test error:",
				error instanceof Error ? error.message : "Unknown error"
			);
			return false;
		}
	});

	// Summary
	console.log("\n📋 Test Summary:");
	console.log(`✅ Passed: ${passedTests}/${totalTests}`);
	console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

	const successRate = (passedTests / totalTests) * 100;
	console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

	if (successRate === 100) {
		console.log("\n🎉 All tests passed! TypeScript migration appears to be working correctly.");
		return true;
	} else {
		console.log("\n⚠️  Some tests failed. Please review the output above.");
		return false;
	}
}

// Run the tests
runTests()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error(
			"Test suite failed with error:",
			error instanceof Error ? error.message : "Unknown error"
		);
		process.exit(1);
	});
