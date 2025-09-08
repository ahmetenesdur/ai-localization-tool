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
exports.translateFile = translateFile;
exports.findLocaleFiles = findLocaleFiles;
exports.validateAndFixExistingTranslations = validateAndFixExistingTranslations;
const path = __importStar(require("path"));
const file_manager_1 = require("../utils/file-manager");
const orchestrator_1 = require("../core/orchestrator");
const state_manager_1 = __importDefault(require("../utils/state-manager"));
// Add StateManager instance
let stateManager = null;
// Console lock for preventing overlapping output
const consoleLock = {
    queue: [],
    isLocked: false,
    async log(message) {
        return new Promise((resolve) => {
            const executeLog = () => {
                console.log(message);
                this.isLocked = false;
                resolve();
                this._processQueue();
            };
            if (this.isLocked) {
                this.queue.push(executeLog);
            }
            else {
                this.isLocked = true;
                executeLog();
            }
        });
    },
    _processQueue() {
        if (this.queue.length > 0 && !this.isLocked) {
            this.isLocked = true;
            const nextLog = this.queue.shift();
            if (nextLog)
                nextLog();
        }
    },
};
/**
 * Validate input parameters for translation process
 */
async function validateTranslationInputs(file, options) {
    if (!file || typeof file !== "string") {
        throw new Error("File path must be a non-empty string");
    }
    if (!options || typeof options !== "object") {
        throw new Error("Options must be an object");
    }
    // Resolve and validate file path to prevent traversal
    const resolvedFile = path.resolve(file);
    const cwd = process.cwd();
    if (!resolvedFile.startsWith(cwd)) {
        throw new Error(`Source file '${file}' is outside working directory (resolved: ${resolvedFile})`);
    }
    return resolvedFile;
}
/**
 * Initialize global statistics structure
 */
function initializeGlobalStats() {
    return {
        total: 0,
        byCategory: {},
        details: {},
        totalTime: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        languages: {},
        startTime: new Date().toISOString(),
    };
}
/**
 * Process a single language translation
 */
async function processLanguage(targetLang, sourceFile, flattenedSource, orchestrator, options, globalStats, comparison) {
    const langStartTime = Date.now();
    try {
        if (!targetLang || typeof targetLang !== "string") {
            throw new Error("Invalid target language provided");
        }
        await consoleLock.log(`\n🌎 Starting translations for ${targetLang}`);
        let finalStatus = null;
        let savedMessage;
        // Initialize language stats
        globalStats.languages[targetLang] = {
            processed: 0,
            added: 0,
            skipped: 0,
            failed: 0,
            timeMs: 0,
        };
        // Create target file path
        const sourceDir = path.dirname(sourceFile);
        const targetPath = path.join(sourceDir, `${targetLang}.json`);
        // Read existing target file
        let targetContent = {};
        try {
            targetContent = await file_manager_1.FileManager.readJSON(targetPath);
            if (!targetContent || typeof targetContent !== "object") {
                targetContent = {};
            }
        }
        catch (err) {
            const error = err;
            if (error.message.includes("ENOENT")) {
                await consoleLock.log(`🆕 Creating new translation file for ${targetLang}`);
            }
            targetContent = {};
        }
        // Flatten target content
        let flattenedTarget = {};
        try {
            // TODO: Import ObjectTransformer when migrated
            const { ObjectTransformer } = require("../utils/object-transformer");
            flattenedTarget = ObjectTransformer.flatten(targetContent);
            if (!flattenedTarget || typeof flattenedTarget !== "object") {
                flattenedTarget = {};
            }
        }
        catch (err) {
            flattenedTarget = {};
        }
        // Find missing or outdated keys
        const missingKeys = [];
        for (const [key, sourceText] of Object.entries(flattenedSource)) {
            globalStats.languages[targetLang].processed++;
            const isNewKey = comparison.newKeys.includes(key);
            const isModifiedKey = comparison.modifiedKeys.includes(key);
            const keyExistsInTarget = key in flattenedTarget;
            // Skip if key exists and not forcing update or modified
            if (keyExistsInTarget && !options.forceUpdate && !isModifiedKey) {
                globalStats.languages[targetLang].skipped++;
                globalStats.skipped++;
                continue;
            }
            missingKeys.push({
                key,
                text: sourceText,
                targetLang,
                existingTranslation: flattenedTarget[key],
                isModified: isModifiedKey,
                isNew: isNewKey,
            });
        }
        if (missingKeys.length === 0) {
            await consoleLock.log(`✅ All translations exist for ${targetLang}`);
            globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
            return { status: { completed: 0, total: 0, language: targetLang } };
        }
        await consoleLock.log(`Found ${missingKeys.length} missing translations for ${targetLang}`);
        // Process translations
        let results = [];
        try {
            results = await orchestrator.processTranslations(missingKeys);
            if (!Array.isArray(results)) {
                results = [];
            }
        }
        catch (err) {
            const error = err;
            console.error(`Error processing translations for ${targetLang}: ${error.message}`);
            results = [];
            globalStats.languages[targetLang].failed += missingKeys.length;
            globalStats.failed += missingKeys.length;
        }
        // Filter valid results
        const validResults = results.filter((result) => result &&
            result.success === true &&
            result.key &&
            typeof result.key === "string" &&
            result.translated &&
            typeof result.translated === "string");
        if (validResults.length > 0) {
            // Update target content
            validResults.forEach(({ key, translated }) => {
                flattenedTarget[key] = translated;
            });
            // Save to file
            const { ObjectTransformer } = require("../utils/object-transformer");
            const unflattened = ObjectTransformer.unflatten(flattenedTarget);
            await file_manager_1.FileManager.writeJSON(targetPath, unflattened);
            // Update statistics
            globalStats.total += validResults.length;
            globalStats.success += validResults.length;
            globalStats.failed += results.length - validResults.length;
            globalStats.languages[targetLang].added += validResults.length;
            globalStats.languages[targetLang].failed += results.length - validResults.length;
            // Update category stats
            validResults.forEach((result) => {
                if (result.context) {
                    const category = result.context.category || "general";
                    globalStats.byCategory[category] = (globalStats.byCategory[category] || 0) + 1;
                    if (!globalStats.details[category]) {
                        globalStats.details[category] = {
                            totalConfidence: 0,
                            samples: 0,
                        };
                    }
                    globalStats.details[category].totalConfidence += result.context.confidence || 0;
                    globalStats.details[category].samples++;
                }
            });
            savedMessage = `\n💾 Translations saved: ${targetLang}.json`;
        }
        globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
        return { status: finalStatus, savedMessage };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await consoleLock.log(`\n❌ Error processing ${targetLang}: ${errorMessage}`);
        if (globalStats.languages[targetLang]) {
            globalStats.languages[targetLang].error = errorMessage;
            globalStats.languages[targetLang].timeMs = Date.now() - langStartTime;
        }
        return { status: null, error: errorMessage };
    }
}
/**
 * Main translator function
 */
async function translateFile(file, options) {
    await consoleLock.log(`\nProcessing File: "${path.basename(file)}"`);
    try {
        const resolvedFile = await validateTranslationInputs(file, options);
        const startTime = Date.now();
        // Read source content
        const sourceContent = await file_manager_1.FileManager.readJSON(resolvedFile);
        const { ObjectTransformer } = require("../utils/object-transformer");
        const flattenedSource = ObjectTransformer.flatten(sourceContent);
        const totalKeys = Object.keys(flattenedSource).length;
        await consoleLock.log(`Source file contains ${totalKeys} translation keys`);
        // Initialize statistics
        const globalStats = initializeGlobalStats();
        // Initialize StateManager if not already done
        if (!stateManager) {
            stateManager = new state_manager_1.default({
                stateDir: options.syncOptions?.stateDir || ".localize-cache",
                stateFileName: options.syncOptions?.stateFileName || "localization.state.json",
            });
        }
        // Load previous state and generate current state
        const previousState = await stateManager.loadState(process.cwd());
        const currentState = stateManager.generateStateFromSource(flattenedSource);
        // Compare states to find changes
        const comparison = stateManager.compareStates(previousState, currentState);
        // Save current state for next run
        try {
            await stateManager.saveState(process.cwd(), currentState);
            await consoleLock.log(`💾 Cache updated successfully`);
        }
        catch (saveError) {
            const errorMessage = saveError instanceof Error ? saveError.message : "Unknown error";
            await consoleLock.log(`⚠️  Warning: Failed to save cache state: ${errorMessage}`);
        }
        // Process all languages
        const languageConcurrency = options.concurrencyLimit || 3;
        const targetLanguages = [...options.targets];
        await consoleLock.log(`🚀 Processing ${targetLanguages.length} languages with concurrency of ${languageConcurrency}`);
        // Process languages in batches
        for (let i = 0; i < targetLanguages.length; i += languageConcurrency) {
            const currentBatch = targetLanguages.slice(i, i + languageConcurrency);
            const batchResults = await Promise.all(currentBatch.map((targetLang) => processLanguage(targetLang, resolvedFile, flattenedSource, new orchestrator_1.Orchestrator({ ...options, concurrencyLimit: 1 }), options, globalStats, comparison)));
            // Log results
            for (const result of batchResults) {
                if (result.savedMessage) {
                    await consoleLock.log(result.savedMessage);
                }
            }
        }
        // Finalize
        globalStats.endTime = new Date().toISOString();
        globalStats.totalDuration = (Date.now() - startTime) / 1000;
        await displayGlobalSummary(globalStats, options.targets.length);
        return globalStats;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await consoleLock.log(`\nTranslation error: ${errorMessage}`);
        throw error;
    }
}
/**
 * Display global summary
 */
async function displayGlobalSummary(stats, totalLanguages) {
    await consoleLock.log("\n🌍 Global Translation Summary:");
    await consoleLock.log(`Languages Processed: ${totalLanguages}`);
    await consoleLock.log(`Total Translations: ${stats.total}`);
    await consoleLock.log(`✅ Success: ${stats.success}`);
    await consoleLock.log(`❌ Failed: ${stats.failed}`);
    await consoleLock.log(`⏭️ Skipped: ${stats.skipped}`);
    await consoleLock.log(`⏳ Total Time: ${stats.totalDuration?.toFixed(1)}s`);
    // Display language stats
    await consoleLock.log("\n📊 Per-language Performance:");
    for (const [lang, langStats] of Object.entries(stats.languages)) {
        const timeSeconds = langStats.timeMs / 1000;
        await consoleLock.log(`${lang}: ${langStats.added} added, ${langStats.skipped} skipped, ${langStats.failed} failed (${timeSeconds.toFixed(1)}s)`);
    }
    await consoleLock.log(`\nAll operations completed successfully in ${stats.totalDuration?.toFixed(1)}s`);
}
/**
 * Find locale files
 */
async function findLocaleFiles(localesDir, sourceLang) {
    try {
        return await file_manager_1.FileManager.findLocaleFiles(localesDir, sourceLang);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await consoleLock.log(`Error finding locale files: ${errorMessage}`);
        return [];
    }
}
/**
 * Validate and fix existing translations (simplified version)
 */
async function validateAndFixExistingTranslations(file, options) {
    await consoleLock.log(`\nChecking existing translations in: "${path.basename(file)}"`);
    // TODO: Implement when quality checker is migrated
    await consoleLock.log("Feature will be available after quality checker migration");
}
//# sourceMappingURL=translator.js.map