const { performance } = require("perf_hooks");
const CONSTANTS = require("./constants");

class RateLimiter {
	constructor(config = {}) {
		// Provider별 대기열 시스템
		// Provider queue system - separate queue for each API provider
		this.queues = {};
		this.processing = {};

		// Configuration
		this.config = {
			queueStrategy: config.queueStrategy || "priority", // priority, fifo
			queueTimeout: config.queueTimeout || CONSTANTS.RATE_LIMITER.DEFAULT_QUEUE_TIMEOUT,
			adaptiveThrottling: config.adaptiveThrottling !== false, // Enabled by default
		};

		this.metrics = {
			responseTimes: {},
			errorRates: {}, // Will store arrays instead of counters
			adjustments: {},
			lastMetricsReset: {},
		};

		// API 공급자별 제한 설정
		// API provider rate limit settings - each provider has different limits
		this.providers = {
			openai: {
				requestsPerMinute: CONSTANTS.PROVIDERS.OPENAI.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.OPENAI.MAX_CONCURRENT,
			},
			deepseek: {
				requestsPerMinute: CONSTANTS.PROVIDERS.DEEPSEEK.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.DEEPSEEK.MAX_CONCURRENT,
			},
			gemini: {
				requestsPerMinute: CONSTANTS.PROVIDERS.GEMINI.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.GEMINI.MAX_CONCURRENT,
			},
			azuredeepseek: {
				requestsPerMinute: CONSTANTS.PROVIDERS.AZUREDEEPSEEK.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.AZUREDEEPSEEK.MAX_CONCURRENT,
			},
			dashscope: {
				requestsPerMinute: CONSTANTS.PROVIDERS.DASHSCOPE.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.DASHSCOPE.MAX_CONCURRENT,
			},
			xai: {
				requestsPerMinute: CONSTANTS.PROVIDERS.XAI.REQUESTS_PER_MINUTE,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: CONSTANTS.PROVIDERS.XAI.MAX_CONCURRENT,
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
		setInterval(() => this._resetCounters(), CONSTANTS.RATE_LIMITER.COUNTER_RESET_INTERVAL);

		setInterval(() => this._cleanupMetrics(), CONSTANTS.RATE_LIMITER.METRICS_CLEANUP_INTERVAL);

		// Adaptive throttling adjustment interval (every 5 minutes)
		if (this.config.adaptiveThrottling) {
			setInterval(
				() => this._adjustThrottling(),
				CONSTANTS.RATE_LIMITER.ADAPTIVE_ADJUSTMENT_INTERVAL
			);
		}
	}

	// Update config options
	updateConfig(config) {
		if (!config) return;

		if (config.queueStrategy) {
			this.config.queueStrategy = config.queueStrategy;
		}

		if (config.queueTimeout) {
			this.config.queueTimeout = config.queueTimeout;
		}

		if (config.adaptiveThrottling !== undefined) {
			this.config.adaptiveThrottling = config.adaptiveThrottling;
		}
	}

	async enqueue(provider, task, priority = 0) {
		provider = provider.toLowerCase();

		if (!this.providers[provider]) {
			throw new Error(`Unknown provider: ${provider}`);
		}

		return new Promise((resolve, reject) => {
			// Add task to provider's queue with timestamp and optional priority
			const queueItem = {
				task,
				resolve,
				reject,
				timestamp: Date.now(),
				priority,
			};

			// Add to queue based on strategy
			if (this.config.queueStrategy === "priority") {
				// Insert based on priority (higher priority first)
				const index = this.queues[provider].findIndex((item) => item.priority < priority);
				if (index === -1) {
					this.queues[provider].push(queueItem);
				} else {
					this.queues[provider].splice(index, 0, queueItem);
				}
			} else {
				// Default to FIFO
				this.queues[provider].push(queueItem);
			}

			// Start processing queue if not already doing so
			this._processQueue(provider);
		});
	}

	async _processQueue(provider) {
		const queue = this.queues[provider];
		const limits = this.providers[provider];

		// No tasks or already processing at max capacity
		if (queue.length === 0 || this.processing[provider] >= limits.maxConcurrent) {
			return;
		}

		// Check for timed out items and remove them
		const now = Date.now();
		const timeoutIndex = queue.findIndex(
			(item) => now - item.timestamp > this.config.queueTimeout
		);

		if (timeoutIndex >= 0) {
			const timedOutItems = queue.splice(0, timeoutIndex + 1);
			timedOutItems.forEach((item) => {
				item.reject(
					new Error(`Request timed out in queue after ${this.config.queueTimeout}ms`)
				);
			});

			// If we've removed all items, nothing to process
			if (queue.length === 0) return;
		}

		// Check rate limit
		if (this._shouldThrottle(provider)) {
			const waitTime = this._calculateWaitTime(provider);
			setTimeout(() => this._processQueue(provider), waitTime);
			return;
		}

		// Get next task
		const { task, resolve, reject, timestamp } = queue.shift();

		// Track metrics for this task
		const startTime = performance.now();
		const queueTime = Date.now() - timestamp;

		if (queueTime > CONSTANTS.LOGGING.QUEUE_WARNING_THRESHOLD) {
			console.warn(`Task for ${provider} waited ${queueTime}ms in queue`);
		}

		// Update counters
		this.processing[provider]++;
		this.providers[provider].currentRequests++;

		try {
			// Execute task
			const result = await task();

			// Track successful response
			const responseTime = performance.now() - startTime;
			this._trackResponseTime(provider, responseTime);
			this._trackErrorRate(provider, false);

			resolve(result);
		} catch (error) {
			// Track error
			this._trackErrorRate(provider, true);
			reject(error);
		} finally {
			// Decrement processing counter
			this.processing[provider]--;

			// Process next item in queue
			setImmediate(() => this._processQueue(provider));
		}
	}

	// Track response time for adaptive throttling
	_trackResponseTime(provider, time) {
		const times = this.metrics.responseTimes[provider];
		times.push(time);

		// Keep only the last 100 response times
		if (times.length > CONSTANTS.RATE_LIMITER.DEFAULT_METRICS_WINDOW) {
			times.shift();
		}
	}

	// Track error rate for adaptive throttling
	_trackErrorRate(provider, isError) {
		const errorRates = this.metrics.errorRates[provider];
		errorRates.push(isError ? 1 : 0);

		// Keep only the last 100 error rates
		if (errorRates.length > CONSTANTS.RATE_LIMITER.DEFAULT_METRICS_WINDOW) {
			errorRates.shift();
		}
	}

	// Adjust throttling settings based on metrics
	_adjustThrottling() {
		if (!this.config.adaptiveThrottling) return;

		Object.keys(this.providers).forEach((provider) => {
			const errorRates = this.metrics.errorRates[provider];
			const errorRate =
				errorRates.length === 0
					? 0
					: errorRates.reduce((a, b) => a + b, 0) / errorRates.length;

			const respTimes = this.metrics.responseTimes[provider];
			const avgResponseTime =
				respTimes.length === 0
					? 0
					: respTimes.reduce((a, b) => a + b, 0) / respTimes.length;

			// Adjust concurrency based on error rate
			let concurrencyAdjustment = 0;
			let rpmAdjustment = 0;

			// If error rate is high, reduce concurrency and RPM
			if (errorRate > CONSTANTS.RATE_LIMITER.ERROR_RATE_THRESHOLD) {
				// >10% errors
				concurrencyAdjustment = -CONSTANTS.RATE_LIMITER.MAX_CONCURRENCY_ADJUSTMENT;
				rpmAdjustment = -CONSTANTS.RATE_LIMITER.MAX_RPM_ADJUSTMENT;
			}
			// If error rate is low and response time is good, increase limits
			else if (
				errorRate < CONSTANTS.RATE_LIMITER.LOW_ERROR_RATE_THRESHOLD &&
				avgResponseTime < CONSTANTS.RATE_LIMITER.RESPONSE_TIME_THRESHOLD &&
				this.queues[provider].length > 0
			) {
				concurrencyAdjustment = CONSTANTS.RATE_LIMITER.MAX_CONCURRENCY_ADJUSTMENT;
				rpmAdjustment = CONSTANTS.RATE_LIMITER.MAX_RPM_ADJUSTMENT;
			}

			// Apply adjustments
			if (concurrencyAdjustment !== 0) {
				const newConcurrency = Math.max(
					CONSTANTS.RATE_LIMITER.MIN_CONCURRENCY,
					this.providers[provider].maxConcurrent + concurrencyAdjustment
				);
				this.providers[provider].maxConcurrent = newConcurrency;
				this.metrics.adjustments[provider].concurrency += concurrencyAdjustment;
			}

			if (rpmAdjustment !== 0) {
				const newRPM = Math.max(
					CONSTANTS.RATE_LIMITER.MIN_RPM,
					this.providers[provider].requestsPerMinute + rpmAdjustment
				);
				this.providers[provider].requestsPerMinute = newRPM;
				this.metrics.adjustments[provider].rpm += rpmAdjustment;
			}
		});
	}

	_shouldThrottle(provider) {
		const limits = this.providers[provider];
		const now = performance.now();

		if (!limits) {
			throw new Error(`Unknown provider: ${provider}`);
		}

		// Reset counter if a minute has passed
		if (now - limits.lastReset >= CONSTANTS.RATE_LIMITER.COUNTER_RESET_INTERVAL) {
			limits.currentRequests = 0;
			limits.lastReset = now;
			return false;
		}

		return limits.currentRequests >= limits.requestsPerMinute;
	}

	_calculateWaitTime(provider) {
		const limits = this.providers[provider];

		if (!limits) {
			throw new Error(`Unknown provider: ${provider}`);
		}

		return Math.max(
			0,
			CONSTANTS.RATE_LIMITER.COUNTER_RESET_INTERVAL - (performance.now() - limits.lastReset)
		);
	}

	_resetCounters() {
		const now = performance.now();

		// Reset all providers' counters
		Object.values(this.providers).forEach((provider) => {
			provider.currentRequests = 0;
			provider.lastReset = now;
		});
	}

	// Get the current queue size for a provider
	getQueueSize(provider) {
		provider = provider.toLowerCase();
		return this.queues[provider]?.length || 0;
	}

	// Get status of all providers
	getStatus() {
		const status = {};

		Object.entries(this.providers).forEach(([name, config]) => {
			const errorRates = this.metrics.errorRates[name];
			const errorRate =
				errorRates.length === 0
					? 0
					: errorRates.reduce((a, b) => a + b, 0) / errorRates.length;

			status[name] = {
				queueSize: this.queues[name]?.length || 0,
				processing: this.processing[name] || 0,
				requestsUsed: config.currentRequests,
				requestsLimit: config.requestsPerMinute,
				resetIn:
					Math.max(
						0,
						CONSTANTS.RATE_LIMITER.COUNTER_RESET_INTERVAL -
							(performance.now() - config.lastReset)
					) / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS,
				errorRate:
					Math.round(errorRate * CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER) /
					CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER,
				adjustments: this.metrics.adjustments[name],
				config: {
					maxConcurrent: config.maxConcurrent,
					rpm: config.requestsPerMinute,
				},
			};
		});

		return status;
	}

	// Get configuration
	getConfig() {
		return { ...this.config };
	}

	_cleanupMetrics() {
		const now = Date.now();

		// Reset all providers' metrics
		Object.values(this.providers).forEach((provider) => {
			this.metrics.responseTimes[provider] = [];
			this.metrics.errorRates[provider] = [];
			this.metrics.adjustments[provider] = { rpm: 0, concurrency: 0 };
			this.metrics.lastMetricsReset[provider] = now;
		});
	}
}

// Configure from environment if available
const config = {
	queueStrategy: process.env.QUEUE_STRATEGY || "priority",
	queueTimeout: parseInt(
		process.env.QUEUE_TIMEOUT || CONSTANTS.RATE_LIMITER.DEFAULT_QUEUE_TIMEOUT.toString()
	),
	adaptiveThrottling: process.env.ADAPTIVE_THROTTLING !== "false",
};

module.exports = new RateLimiter(config);
