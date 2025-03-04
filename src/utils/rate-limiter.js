const { performance } = require("perf_hooks");

class RateLimiter {
	constructor() {
		this.queue = [];
		this.processing = false;
		this.providers = {
			openai: {
				requestsPerMinute: 60,
				currentRequests: 0,
				lastReset: performance.now(),
			},
			deepseek: {
				requestsPerMinute: 45,
				currentRequests: 0,
				lastReset: performance.now(),
			},
			gemini: {
				requestsPerMinute: 100,
				currentRequests: 0,
				lastReset: performance.now(),
			},
			azuredeepseek: {
				requestsPerMinute: 80,
				currentRequests: 0,
				lastReset: performance.now(),
			},
			dashscope: {
				requestsPerMinute: 50,
				currentRequests: 0,
				lastReset: performance.now(),
			},
			xai: {
				requestsPerMinute: 60,
				currentRequests: 0,
				lastReset: performance.now(),
			},
		};
	}

	async enqueue(provider, task) {
		return new Promise((resolve, reject) => {
			this.queue.push({ provider, task, resolve, reject });
			this.processQueue();
		});
	}

	async processQueue() {
		if (this.processing || this.queue.length === 0) return;
		this.processing = true;

		const { provider, task, resolve, reject } = this.queue[0];

		try {
			if (!this.providers[provider]) {
				throw new Error(`Unknown provider: ${provider}`);
			}

			if (this.shouldThrottle(provider)) {
				const waitTime = this.calculateWaitTime(provider);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}

			this.providers[provider].currentRequests++;
			const result = await task();
			resolve(result);
		} catch (error) {
			reject(error);
		} finally {
			this.queue.shift();
			this.processing = false;
			if (this.queue.length > 0) {
				setImmediate(() => this.processQueue());
			}
		}
	}

	shouldThrottle(provider) {
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

	calculateWaitTime(provider) {
		const limits = this.providers[provider];

		if (!limits) {
			throw new Error(`Unknown provider: ${provider}`);
		}

		return Math.max(0, 60000 - (performance.now() - limits.lastReset));
	}
}

module.exports = new RateLimiter();
