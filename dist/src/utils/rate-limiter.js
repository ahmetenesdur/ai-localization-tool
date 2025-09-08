"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const perf_hooks_1 = require("perf_hooks");
class RateLimiter {
    constructor(config = {}) {
        this.queues = {};
        this.processing = {};
        this._intervals = []; // Store interval references for cleanup
        // Configuration
        this.config = {
            queueStrategy: config.queueStrategy || "fifo",
            queueTimeout: config.queueTimeout || 15000,
            adaptiveThrottling: config.adaptiveThrottling !== false,
        };
        this.metrics = {
            responseTimes: {},
            errorRates: {},
            adjustments: {},
            lastMetricsReset: {},
        };
        // API provider rate limit settings - each provider has different limits
        this.providers = {
            openai: {
                requestsPerMinute: 300,
                currentRequests: 0,
                lastReset: perf_hooks_1.performance.now(),
                maxConcurrent: 5,
            },
            deepseek: {
                requestsPerMinute: 30,
                currentRequests: 0,
                lastReset: perf_hooks_1.performance.now(),
                maxConcurrent: 2,
            },
            gemini: {
                requestsPerMinute: 300,
                currentRequests: 0,
                lastReset: perf_hooks_1.performance.now(),
                maxConcurrent: 5,
            },
            dashscope: {
                requestsPerMinute: 80,
                currentRequests: 0,
                lastReset: perf_hooks_1.performance.now(),
                maxConcurrent: 6,
            },
            xai: {
                requestsPerMinute: 80,
                currentRequests: 0,
                lastReset: perf_hooks_1.performance.now(),
                maxConcurrent: 8,
            },
        };
        Object.keys(this.providers).forEach((provider) => {
            this.queues[provider] = [];
            this.processing[provider] = 0;
            this.metrics.responseTimes[provider] = [];
            this.metrics.errorRates[provider] = [];
            this.metrics.adjustments[provider] = { rpm: 0, concurrency: 0 };
            this.metrics.lastMetricsReset[provider] = Date.now();
        });
        // Auto-reset counters every minute
        this._intervals.push(setInterval(() => this._resetCounters(), 60000));
        this._intervals.push(setInterval(() => this._cleanupMetrics(), 2 * 60 * 1000)); // Every 2 minutes
        // Adaptive throttling adjustment interval (every 5 minutes)
        if (this.config.adaptiveThrottling) {
            this._intervals.push(setInterval(() => this._adjustThrottling(), 5 * 60 * 1000));
        }
    }
    /**
     * Cleanup method to clear all intervals and allow process to exit
     */
    destroy() {
        // Clear all intervals
        this._intervals.forEach((interval) => clearInterval(interval));
        this._intervals = [];
        // Clear all queues
        Object.keys(this.queues).forEach((provider) => {
            this.queues[provider] = [];
        });
        // Reset processing counters
        Object.keys(this.processing).forEach((provider) => {
            this.processing[provider] = 0;
        });
    }
    /**
     * Update config options
     */
    updateConfig(config) {
        if (!config)
            return;
        if (config.queueStrategy) {
            this.config.queueStrategy = config.queueStrategy;
        }
        if (config.queueTimeout) {
            this.config.queueTimeout = config.queueTimeout;
        }
        if (config.adaptiveThrottling !== undefined) {
            this.config.adaptiveThrottling = config.adaptiveThrottling;
        }
        // Update provider limits from config
        if (config.providerLimits && typeof config.providerLimits === "object") {
            Object.keys(config.providerLimits).forEach((providerName) => {
                const provider = this.providers[providerName];
                const limits = config.providerLimits[providerName];
                if (provider && limits) {
                    if (limits.rpm && typeof limits.rpm === "number") {
                        provider.requestsPerMinute = limits.rpm;
                    }
                    if (limits.concurrency && typeof limits.concurrency === "number") {
                        provider.maxConcurrent = limits.concurrency;
                    }
                }
            });
            console.log("🔧 Provider limits updated from config");
        }
    }
    async enqueue(provider, task, priority = 0) {
        const normalizedProvider = provider.toLowerCase();
        if (!this.providers[normalizedProvider]) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        // Ensure queue exists
        if (!this.queues[normalizedProvider]) {
            this.queues[normalizedProvider] = [];
        }
        // Ensure processing counter exists
        if (this.processing[normalizedProvider] === undefined) {
            this.processing[normalizedProvider] = 0;
        }
        return new Promise((resolve, reject) => {
            const queueItem = {
                task,
                resolve,
                reject,
                timestamp: Date.now(),
                priority,
            };
            const queue = this.queues[normalizedProvider];
            if (!queue)
                return;
            if (this.config.queueStrategy === "priority") {
                const index = queue.findIndex((item) => item.priority < priority);
                if (index === -1) {
                    queue.push(queueItem);
                }
                else {
                    queue.splice(index, 0, queueItem);
                }
            }
            else {
                queue.push(queueItem);
            }
            this._processQueue(normalizedProvider);
        });
    }
    async _processQueue(provider) {
        if (!provider || typeof provider !== "string") {
            return;
        }
        const queue = this.queues[provider];
        const limits = this.providers[provider];
        if (!queue || !Array.isArray(queue) || !limits || typeof limits !== "object") {
            console.warn(`Invalid queue or limits for provider: ${provider}`);
            return;
        }
        const currentProcessing = this.processing[provider] || 0;
        if (queue.length === 0 || currentProcessing >= limits.maxConcurrent) {
            return;
        }
        if (this._processingLocks && this._processingLocks[provider]) {
            return; // Another process is already handling this provider
        }
        if (!this._processingLocks) {
            this._processingLocks = {};
        }
        this._processingLocks[provider] = true;
        try {
            if (queue.length === 0 || (this.processing[provider] || 0) >= limits.maxConcurrent) {
                return;
            }
            const now = Date.now();
            const timedOutItems = [];
            let i = 0;
            while (i < queue.length &&
                queue[i] &&
                typeof queue[i] === "object" &&
                queue[i]?.timestamp &&
                now - queue[i].timestamp > this.config.queueTimeout) {
                const item = queue[i];
                if (item) {
                    timedOutItems.push(item);
                }
                i++;
            }
            if (timedOutItems.length > 0) {
                queue.splice(0, timedOutItems.length);
                setImmediate(() => {
                    timedOutItems.forEach((item) => {
                        try {
                            item.reject(new Error(`Request timed out in queue after ${this.config.queueTimeout}ms`));
                        }
                        catch (error) {
                            // Ignore errors in rejection
                        }
                    });
                });
            }
            if (queue.length === 0) {
                return;
            }
            if (this._shouldThrottle(provider)) {
                const waitTime = this._calculateWaitTime(provider);
                setTimeout(() => this._processQueue(provider), waitTime);
                return;
            }
            const queueItem = queue.shift();
            if (!queueItem || typeof queueItem !== "object") {
                return; // Queue was emptied by another process or contains invalid item
            }
            const { task, resolve, reject, timestamp } = queueItem;
            if (typeof task !== "function" ||
                typeof resolve !== "function" ||
                typeof reject !== "function" ||
                typeof timestamp !== "number") {
                console.warn("Invalid queue item structure detected, skipping");
                return;
            }
            const startTime = perf_hooks_1.performance.now();
            const queueTime = Date.now() - timestamp;
            if (queueTime > 2000) {
                console.warn(`Task for ${provider} waited ${queueTime}ms in queue`);
            }
            // Ensure processing counter exists and increment
            if (this.processing[provider] === undefined) {
                this.processing[provider] = 0;
            }
            this.processing[provider]++;
            // Ensure provider exists before incrementing
            const providerConfig = this.providers[provider];
            if (providerConfig) {
                providerConfig.currentRequests++;
            }
            try {
                const result = await task();
                const responseTime = perf_hooks_1.performance.now() - startTime;
                this._trackResponseTime(provider, responseTime);
                this._trackErrorRate(provider, false);
                resolve(result);
            }
            catch (error) {
                this._trackErrorRate(provider, true);
                console.error(`Provider ${provider} task failed:`, {
                    error: error instanceof Error ? error.message : "Unknown error",
                    queueTime: queueTime,
                    processingTime: perf_hooks_1.performance.now() - startTime,
                    queueSize: queue.length,
                });
                reject(error);
            }
            finally {
                // Safely decrement processing counter
                if (this.processing[provider] !== undefined && this.processing[provider] > 0) {
                    this.processing[provider]--;
                }
                // Safely decrement provider request counter
                const providerConfig = this.providers[provider];
                if (providerConfig && providerConfig.currentRequests > 0) {
                    providerConfig.currentRequests--;
                }
                setImmediate(() => this._processQueue(provider));
            }
        }
        finally {
            if (this._processingLocks) {
                this._processingLocks[provider] = false;
            }
        }
    }
    _shouldThrottle(provider) {
        const providerConfig = this.providers[provider];
        if (!providerConfig)
            return true;
        const now = perf_hooks_1.performance.now();
        const timeSinceReset = now - providerConfig.lastReset;
        const requestsPerMinute = providerConfig.requestsPerMinute;
        // Calculate expected requests based on time elapsed
        const expectedRequests = (timeSinceReset / 60000) * requestsPerMinute;
        // Throttle if we've exceeded the expected rate
        return providerConfig.currentRequests >= expectedRequests;
    }
    _calculateWaitTime(provider) {
        const providerConfig = this.providers[provider];
        if (!providerConfig)
            return 1000;
        const now = perf_hooks_1.performance.now();
        const timeSinceReset = now - providerConfig.lastReset;
        const timeUntilReset = Math.max(0, 60000 - timeSinceReset);
        // Wait for a portion of the reset period, but at least 100ms
        return Math.max(100, timeUntilReset / 4);
    }
    _resetCounters() {
        const now = perf_hooks_1.performance.now();
        Object.values(this.providers).forEach((provider) => {
            if (now - provider.lastReset >= 60000) {
                provider.currentRequests = 0;
                provider.lastReset = now;
            }
        });
    }
    _cleanupMetrics() {
        const now = Date.now();
        Object.keys(this.providers).forEach((providerName) => {
            const responseTimes = this.metrics.responseTimes[providerName];
            const errorRates = this.metrics.errorRates[providerName];
            const adjustments = this.metrics.adjustments[providerName];
            if (responseTimes) {
                responseTimes.length = 0;
            }
            if (errorRates) {
                errorRates.length = 0;
            }
            if (adjustments) {
                adjustments.rpm = 0;
                adjustments.concurrency = 0;
            }
            this.metrics.lastMetricsReset[providerName] = now;
        });
    }
    _adjustThrottling() {
        if (!this.config.adaptiveThrottling)
            return;
        Object.keys(this.providers).forEach((providerName) => {
            const errorRates = this.metrics.errorRates[providerName];
            const adjustments = this.metrics.adjustments[providerName];
            if (!errorRates || errorRates.length === 0)
                return;
            const avgErrorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;
            const provider = this.providers[providerName];
            if (!provider)
                return;
            // Adjust based on error rate
            if (avgErrorRate > 0.1) {
                // High error rate - reduce limits
                const reductionFactor = Math.max(0.5, 1 - avgErrorRate);
                provider.requestsPerMinute = Math.max(10, Math.floor(provider.requestsPerMinute * reductionFactor));
                provider.maxConcurrent = Math.max(1, Math.floor(provider.maxConcurrent * reductionFactor));
                if (adjustments) {
                    adjustments.rpm -= provider.requestsPerMinute * (1 - reductionFactor);
                    adjustments.concurrency -= provider.maxConcurrent * (1 - reductionFactor);
                }
            }
            else if (avgErrorRate < 0.02) {
                // Low error rate - increase limits
                const increaseFactor = 1.1;
                provider.requestsPerMinute = Math.min(provider.requestsPerMinute * 2, Math.floor(provider.requestsPerMinute * increaseFactor));
                provider.maxConcurrent = Math.min(20, Math.floor(provider.maxConcurrent * increaseFactor));
                if (adjustments) {
                    adjustments.rpm += provider.requestsPerMinute * (increaseFactor - 1);
                    adjustments.concurrency += provider.maxConcurrent * (increaseFactor - 1);
                }
            }
        });
    }
    _trackResponseTime(provider, time) {
        const times = this.metrics.responseTimes[provider];
        if (!times)
            return;
        const MAX_RESPONSE_TIMES = 50;
        times.push(time);
        if (times.length > MAX_RESPONSE_TIMES) {
            times.splice(0, times.length - MAX_RESPONSE_TIMES);
        }
    }
    _trackErrorRate(provider, isError) {
        const errorRates = this.metrics.errorRates[provider];
        if (!errorRates)
            return;
        const MAX_ERROR_RATES = 50;
        errorRates.push(isError ? 1 : 0);
        if (errorRates.length > MAX_ERROR_RATES) {
            errorRates.splice(0, errorRates.length - MAX_ERROR_RATES);
        }
    }
    getQueueSize(provider) {
        const normalizedProvider = provider.toLowerCase();
        return this.queues[normalizedProvider]?.length || 0;
    }
    getStatus() {
        const status = {};
        Object.entries(this.providers).forEach(([name, config]) => {
            const errorRates = this.metrics.errorRates[name];
            const adjustments = this.metrics.adjustments[name];
            const errorRate = !errorRates || errorRates.length === 0
                ? 0
                : errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
            status[name] = {
                queueSize: this.queues[name]?.length || 0,
                processing: this.processing[name] || 0,
                requestsUsed: config.currentRequests,
                requestsLimit: config.requestsPerMinute,
                resetIn: Math.max(0, 60000 - (perf_hooks_1.performance.now() - config.lastReset)) / 1000,
                errorRate: Math.round(errorRate * 100) / 100,
                adjustments: adjustments || { rpm: 0, concurrency: 0 },
                config: {
                    maxConcurrent: config.maxConcurrent,
                    rpm: config.requestsPerMinute,
                },
            };
        });
        return status;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.RateLimiter = RateLimiter;
const config = {
    queueStrategy: process.env.QUEUE_STRATEGY || "priority",
    queueTimeout: parseInt(process.env.QUEUE_TIMEOUT || "30000"),
    adaptiveThrottling: process.env.ADAPTIVE_THROTTLING !== "false",
};
exports.default = new RateLimiter(config);
//# sourceMappingURL=rate-limiter.js.map