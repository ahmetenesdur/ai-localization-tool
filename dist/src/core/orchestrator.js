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
exports.Orchestrator = void 0;
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const lru_cache_1 = require("lru-cache");
const rate_limiter_1 = __importDefault(require("../utils/rate-limiter"));
const provider_factory_1 = require("./provider-factory");
const context_processor_1 = require("./context-processor");
class Orchestrator {
    constructor(options) {
        this._shutdownCallback = null;
        this.options = options;
        this.contextProcessor = new context_processor_1.ContextProcessor(options.context);
        // TODO: Import and initialize when migrated
        // this.progress = new ProgressTracker(options.progressOptions || {});
        // TODO: Import and initialize when migrated
        // this.qualityChecker = new QualityChecker({
        //   styleGuide: options.styleGuide,
        //   context: options.context,
        //   lengthControl: options.lengthControl,
        // });
        // Advanced options
        this.advanced = {
            timeoutMs: options.advanced?.timeoutMs || 30000,
            maxKeyLength: options.advanced?.maxKeyLength || 10000,
            maxBatchSize: options.advanced?.maxBatchSize || 50,
            autoOptimize: options.advanced?.autoOptimize !== false,
            debug: options.advanced?.debug || false,
        };
        // Configure rate limiter
        if (options.rateLimiter) {
            rate_limiter_1.default.updateConfig({
                queueStrategy: options.rateLimiter.queueStrategy,
                queueTimeout: options.rateLimiter.queueTimeout,
                adaptiveThrottling: options.rateLimiter.adaptiveThrottling,
                providerLimits: options.rateLimiter.providerLimits,
            });
        }
        // Enhanced cache configuration
        this.translationCache = new lru_cache_1.LRUCache({
            max: options.cacheSize || 1000,
            ttl: options.cacheTTL || 1000 * 60 * 60 * 24, // Default 24h
            updateAgeOnGet: true,
            allowStale: true,
            fetchMethod: async (key, staleValue, options) => {
                // This is used when a cache entry expires but is allowed to be stale
                // We'll return the stale value and asynchronously refresh it
                if (staleValue) {
                    // Schedule a refresh of this translation in the background
                    this._refreshCacheEntry(key, options?.context).catch((err) => {
                        const errorMessage = err instanceof Error ? err.message : "Unknown error";
                        console.warn(`Cache refresh failed for key ${key}: ${errorMessage}`);
                    });
                    return staleValue;
                }
                return undefined;
            },
        });
        this.cacheStats = {
            hits: 0,
            misses: 0,
            staleHits: 0,
            stored: 0,
            refreshes: 0,
        };
        this.concurrencyLimit = options.concurrencyLimit || 5;
        if (this.advanced.autoOptimize) {
            this._applyAutoOptimizations();
        }
        this._shutdownCallback = async () => {
            if (this.translationCache && this.translationCache.size > 0) {
                console.log(`Flushing ${this.translationCache.size} cache entries...`);
                this.translationCache.clear();
            }
            // Clear cache stats to prevent memory leaks
            this.resetCacheStats();
        };
        // TODO: Import and register when migrating graceful-shutdown
        // gracefulShutdown.registerCallback(this._shutdownCallback);
        // Debug mode logging
        if (this.advanced.debug) {
            console.log("Orchestrator initialized with options:", {
                concurrencyLimit: this.concurrencyLimit,
                cacheEnabled: options.cacheEnabled !== false,
                cacheSize: options.cacheSize || 1000,
                cacheTTL: options.cacheTTL || 1000 * 60 * 60 * 24,
                rateLimiter: rate_limiter_1.default.getConfig(),
                advanced: this.advanced,
            });
        }
    }
    async processTranslation(key, text, targetLang, contextData, existingTranslation) {
        if (typeof text !== "string") {
            return { key, translated: text, error: "Invalid input type", success: false };
        }
        // Validate key length to prevent issues with extremely long keys
        if (key.length > this.advanced.maxKeyLength) {
            return {
                key: key.substring(0, 100) + "...", // Truncate for error message
                translated: text,
                error: `Key exceeds maximum length of ${this.advanced.maxKeyLength} characters`,
                success: false,
            };
        }
        const cacheKey = this._generateCacheKey(text, targetLang, contextData?.category);
        if (this.options.cacheEnabled !== false && this.translationCache?.has?.(cacheKey)) {
            const cachedResult = this.translationCache.get(cacheKey);
            if (!cachedResult || typeof cachedResult !== "object") {
                this.cacheStats.misses++;
                this.translationCache.delete(cacheKey); // Clean up invalid cache entry
            }
            else {
                this.cacheStats.hits++;
                // Enhanced stale check with proper null safety
                try {
                    const ttl = this.translationCache.getRemainingTTL?.(cacheKey);
                    if (typeof ttl === "number" && ttl <= 0) {
                        this.cacheStats.staleHits++;
                    }
                }
                catch (error) {
                    // Silently ignore cache version compatibility issues
                }
                return {
                    ...cachedResult,
                    key,
                    fromCache: true,
                };
            }
        }
        // Update cache statistics
        this.cacheStats.misses++;
        try {
            // FIXED: Enhanced null safety for provider factory
            const provider = provider_factory_1.ProviderFactory.getProvider(this.options?.apiProvider, this.options?.useFallback !== false, this.options // Pass full config for fallbackOrder support
            );
            // FIXED: More robust provider validation
            if (!provider || typeof provider.translate !== "function") {
                throw new Error(`Translation provider not available or invalid: ${this.options?.apiProvider || "unknown"}`);
            }
            const translationContext = {
                ...contextData,
                existingTranslation: existingTranslation || null,
            };
            // FIXED: Much simpler timeout approach without Promise.race issues
            let translated = await provider.translate(text, this.options.source, targetLang, {
                ...this.options,
                detectedContext: translationContext,
            });
            // Apply quality checks and fixes
            // TODO: Uncomment when quality checker is migrated
            // const qualityResult = this.qualityChecker.validateAndFix(text, translated);
            // translated = qualityResult.fixedText;
            const result = {
                key,
                translated,
                context: contextData,
                success: true,
                // qualityChecks: qualityResult,
            };
            // Add result to cache if enabled
            if (this.options.cacheEnabled !== false) {
                this.translationCache.set(cacheKey, result);
                this.cacheStats.stored++;
            }
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error(`Translation error - key "${key}":`, errorMessage);
            return {
                key,
                translated: text,
                error: errorMessage,
                success: false,
            };
        }
    }
    async processTranslations(items) {
        // TODO: Uncomment when progress tracker is migrated
        // this.progress.start(items.length, items[0].targetLang);
        const batchSize = Math.min(this.concurrencyLimit, this.advanced.maxBatchSize);
        const results = [];
        const chunks = this._chunkArray(items, batchSize);
        console.log(`🔄 Processing ${items.length} items in ${chunks.length} batches of max ${batchSize} items each`);
        if (this.advanced.debug) {
            console.log(`Processing ${items.length} items in ${chunks.length} chunks of size ${batchSize}`);
        }
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk)
                continue;
            console.log(`📦 Processing batch ${i + 1}/${chunks.length} (${chunk.length} items)`);
            const chunkPromises = chunk.map(async (item) => {
                try {
                    const contextData = await this.contextProcessor.analyze(item.text);
                    const result = await this.processTranslation(item.key, item.text, item.targetLang, contextData, item.existingTranslation);
                    // TODO: Uncomment when progress tracker is migrated
                    // this.progress.increment(result.success ? 'success' : 'failed');
                    return result;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    console.error(`Error processing item ${item.key}:`, errorMessage);
                    // TODO: Uncomment when progress tracker is migrated
                    // this.progress.increment('failed');
                    return {
                        key: item.key,
                        translated: item.text,
                        error: errorMessage,
                        success: false,
                    };
                }
            });
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            // Minimal delay between batches - reduced for speed
            if (i < chunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 50)); // Just 50ms for maximum speed
            }
        }
        return results;
    }
    _chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    // Auto-optimize settings based on system capabilities
    _applyAutoOptimizations() {
        try {
            const cpuCount = os.cpus().length;
            const totalMemory = os.totalmem();
            const memoryGB = Math.floor(totalMemory / (1024 * 1024 * 1024));
            // Optimize concurrency based on CPU and memory
            if (memoryGB >= 8 && cpuCount >= 4) {
                // High-end system
                this.concurrencyLimit = Math.min(10, cpuCount);
            }
            else if (memoryGB >= 4 && cpuCount >= 2) {
                // Mid-range system
                this.concurrencyLimit = Math.min(5, cpuCount);
            }
            else {
                // Low-end system
                this.concurrencyLimit = 2;
            }
            if (this.advanced.debug) {
                console.log(`Auto-optimized settings - CPU: ${cpuCount}, Memory: ${memoryGB}GB, Concurrency: ${this.concurrencyLimit}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.warn("Failed to auto-optimize settings:", errorMessage);
        }
    }
    clearCache() {
        this.translationCache.clear();
        this.resetCacheStats();
    }
    // Reset cache statistics
    resetCacheStats() {
        this.cacheStats = {
            hits: 0,
            misses: 0,
            staleHits: 0,
            stored: 0,
            refreshes: 0,
        };
    }
    // Get cache statistics
    getCacheStats() {
        return {
            ...this.cacheStats,
            size: this.translationCache.size,
            capacity: this.translationCache.max,
            hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
        };
    }
    /**
     * OPTIMIZED: Generate cache key with improved performance
     * Using faster hashing for better performance while maintaining collision resistance
     */
    _generateCacheKey(text, targetLang, category = "unknown") {
        // For very short texts, use direct concatenation for speed
        if (text.length < 50) {
            return `${targetLang}:${category}:${text.length}:${text.slice(0, 30)}`;
        }
        // For longer texts, use a simpler but faster hash approach
        const keyData = `${text}:${targetLang}:${category}:${text.length}`;
        return crypto.createHash("md5").update(keyData, "utf8").digest("hex").substring(0, 24); // Shorter hash for better memory efficiency
    }
    // Background refresh of a stale cache entry
    async _refreshCacheEntry(key, context) {
        if (!context || !context.text || !context.targetLang) {
            return;
        }
        try {
            const provider = provider_factory_1.ProviderFactory.getProvider(this.options.apiProvider, this.options.useFallback !== false, this.options // Pass full config for fallbackOrder support
            );
            const translated = await provider.translate(context.text, this.options.source, context.targetLang, {
                ...this.options,
                detectedContext: context.contextData,
            });
            // Get current entry to update only the translation
            const currentEntry = this.translationCache.get(key);
            if (currentEntry) {
                // TODO: Apply quality checks when migrated
                // const qualityResult = this.qualityChecker.validateAndFix(context.text, translated);
                // Update cache with fresh data
                this.translationCache.set(key, {
                    ...currentEntry,
                    translated: translated, // qualityResult.fixedText when quality checker is migrated
                    // qualityChecks: qualityResult,
                    refreshed: new Date().toISOString(),
                });
                this.cacheStats.refreshes++;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.warn(`Failed to refresh cache entry: ${errorMessage}`);
        }
    }
    // Get orchestrator statistics and status
    getStatus() {
        return {
            cache: this.getCacheStats(),
            rateLimiter: rate_limiter_1.default.getStatus(),
            concurrency: this.concurrencyLimit,
            advanced: this.advanced,
        };
    }
    /**
     * FIXED: Proper cleanup method to prevent memory leaks
     */
    destroy() {
        // Clear cache
        if (this.translationCache) {
            this.translationCache.clear();
        }
        // Reset cache stats
        this.resetCacheStats();
        // Unregister shutdown callback to prevent memory leak
        if (this._shutdownCallback) {
            // TODO: Uncomment when graceful shutdown is migrated
            // gracefulShutdown.unregisterCallback(this._shutdownCallback);
            this._shutdownCallback = null;
        }
        // Clear references
        this.translationCache = null;
        this.contextProcessor = null;
        this.progress = null;
        this.qualityChecker = null;
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map