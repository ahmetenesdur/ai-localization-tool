const { performance } = require("perf_hooks");

class RateLimiter {
	constructor(config = {}) {
		this.queues = {};
		this.processing = {};

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

		this.providers = {
			openai: {
				requestsPerMinute: 300,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: 5,
			},
			deepseek: {
				requestsPerMinute: 30,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: 2,
			},
			gemini: {
				requestsPerMinute: 300,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: 5,
			},
			dashscope: {
				requestsPerMinute: 80,
				currentRequests: 0,
				lastReset: performance.now(),
				maxConcurrent: 6,
			},
			xai: {
				requestsPerMinute: 80,
				currentRequests: 0,
				lastReset: performance.now(),
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

		setInterval(() => this._resetCounters(), 60000);

		setInterval(() => this._cleanupMetrics(), 2 * 60 * 1000);

		if (this.config.adaptiveThrottling) {
			setInterval(() => this._adjustThrottling(), 5 * 60 * 1000);
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

		if (config.providerLimits && typeof config.providerLimits === "object") {
			Object.keys(config.providerLimits).forEach((providerName) => {
				if (this.providers[providerName]) {
					const limits = config.providerLimits[providerName];

					if (limits.rpm && typeof limits.rpm === "number") {
						this.providers[providerName].requestsPerMinute = limits.rpm;
					}
					if (limits.concurrency && typeof limits.concurrency === "number") {
						this.providers[providerName].maxConcurrent = limits.concurrency;
					}
				}
			});
			console.log("🔧 Provider limits updated from config");
		}
	}

	async enqueue(provider, task, priority = 0) {
		provider = provider.toLowerCase();

		if (!this.providers[provider]) {
			throw new Error(`Unknown provider: ${provider}`);
		}

		return new Promise((resolve, reject) => {
			const queueItem = {
				task,
				resolve,
				reject,
				timestamp: Date.now(),
				priority,
			};

			if (this.config.queueStrategy === "priority") {
				const index = this.queues[provider].findIndex((item) => item.priority < priority);
				if (index === -1) {
					this.queues[provider].push(queueItem);
				} else {
					this.queues[provider].splice(index, 0, queueItem);
				}
			} else {
				this.queues[provider].push(queueItem);
			}

			this._processQueue(provider);
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
			return;
		}

		if (!this._processingLocks) {
			this._processingLocks = {};
		}
		this._processingLocks[provider] = true;

		try {
			if (queue.length === 0 || this.processing[provider] >= limits.maxConcurrent) {
				return;
			}

			const now = Date.now();
			const timedOutItems = [];
			let i = 0;

			while (
				i < queue.length &&
				queue[i] &&
				typeof queue[i] === "object" &&
				queue[i].timestamp &&
				now - queue[i].timestamp > this.config.queueTimeout
			) {
				timedOutItems.push(queue[i]);
				i++;
			}

			if (timedOutItems.length > 0) {
				queue.splice(0, timedOutItems.length);

				setImmediate(() => {
					timedOutItems.forEach((item) => {
						try {
							item.reject(
								new Error(
									`Request timed out in queue after ${this.config.queueTimeout}ms`
								)
							);
						} catch (error) {}
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

			if (
				typeof task !== "function" ||
				typeof resolve !== "function" ||
				typeof reject !== "function" ||
				typeof timestamp !== "number"
			) {
				console.warn("Invalid queue item structure detected, skipping");
				return;
			}

			const startTime = performance.now();
			const queueTime = Date.now() - timestamp;

			if (queueTime > 30000) {
				console.warn(`Task for ${provider} waited ${queueTime}ms in queue`);
			}

			this.processing[provider]++;
			this.providers[provider].currentRequests++;

			try {
				const result = await task();

				const responseTime = performance.now() - startTime;
				this._trackResponseTime(provider, responseTime);
				this._trackErrorRate(provider, false);

				resolve(result);
			} catch (error) {
				this._trackErrorRate(provider, true);

				console.error(`Provider ${provider} task failed:`, {
					error: error.message,
					queueTime: queueTime,
					processingTime: performance.now() - startTime,
					queueSize: queue.length,
				});
				reject(error);
			} finally {
				this.processing[provider]--;

				setImmediate(() => this._processQueue(provider));
			}
		} finally {
			if (this._processingLocks) {
				this._processingLocks[provider] = false;
			}
		}
	}

	_trackResponseTime(provider, time) {
		const times = this.metrics.responseTimes[provider];
		const MAX_RESPONSE_TIMES = 50;

		times.push(time);

		if (times.length > MAX_RESPONSE_TIMES) {
			times.splice(0, times.length - MAX_RESPONSE_TIMES);
		}
	}

	_trackErrorRate(provider, isError) {
		const errorRates = this.metrics.errorRates[provider];
		const MAX_ERROR_RATES = 50;

		errorRates.push(isError ? 1 : 0);

		if (errorRates.length > MAX_ERROR_RATES) {
			errorRates.splice(0, errorRates.length - MAX_ERROR_RATES);
		}
	}

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

			let concurrencyAdjustment = 0;
			let rpmAdjustment = 0;

			if (errorRate > 0.15) {
				concurrencyAdjustment = -1;
				rpmAdjustment = -5;
			} else if (
				errorRate < 0.05 &&
				avgResponseTime < 3000 &&
				this.queues[provider].length > 0
			) {
				concurrencyAdjustment = 1;
				rpmAdjustment = 5;
			}

			if (concurrencyAdjustment !== 0) {
				const newConcurrency = Math.max(
					1,
					this.providers[provider].maxConcurrent + concurrencyAdjustment
				);
				this.providers[provider].maxConcurrent = newConcurrency;
				this.metrics.adjustments[provider].concurrency += concurrencyAdjustment;
			}

			if (rpmAdjustment !== 0) {
				const newRPM = Math.max(
					10,
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

		if (now - limits.lastReset >= 60000) {
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

		return Math.max(0, 60000 - (performance.now() - limits.lastReset));
	}

	_resetCounters() {
		const now = performance.now();

		Object.values(this.providers).forEach((provider) => {
			provider.currentRequests = 0;
			provider.lastReset = now;
		});
	}

	getQueueSize(provider) {
		provider = provider.toLowerCase();
		return this.queues[provider]?.length || 0;
	}

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
				resetIn: Math.max(0, 60000 - (performance.now() - config.lastReset)) / 1000,
				errorRate: Math.round(errorRate * 100) / 100,
				adjustments: this.metrics.adjustments[name],
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

	clearAllQueues() {
		for (const provider in this.queues) {
			if (this.queues[provider] && this.queues[provider].length > 0) {
				console.log(
					`Clearing ${this.queues[provider].length} pending operations for ${provider}`
				);
				this.queues[provider].forEach((item) => {
					if (item.reject) {
						item.reject(new Error("Operation cancelled due to shutdown"));
					}
				});
				this.queues[provider] = [];
			}
			this.processing[provider] = 0;
		}
	}

	_cleanupMetrics() {
		const now = Date.now();

		Object.keys(this.providers).forEach((providerName) => {
			this.metrics.responseTimes[providerName].length = 0;
			this.metrics.errorRates[providerName].length = 0;
			this.metrics.adjustments[providerName] = { rpm: 0, concurrency: 0 };
			this.metrics.lastMetricsReset[providerName] = now;
		});
	}
}

const config = {
	queueStrategy: process.env.QUEUE_STRATEGY || "priority",
	queueTimeout: parseInt(process.env.QUEUE_TIMEOUT || "30000"),
	adaptiveThrottling: process.env.ADAPTIVE_THROTTLING !== "false",
};

module.exports = new RateLimiter(config);
