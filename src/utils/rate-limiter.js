class RateLimiter {
	constructor() {
		this.queue = [];
		this.processing = false;
		this.providers = {
			openai: {
				requestsPerMinute: 60,
				currentRequests: 0,
				lastReset: Date.now(),
			},
			deepseek: {
				requestsPerMinute: 45,
				currentRequests: 0,
				lastReset: Date.now(),
			},
			gemini: {
				requestsPerMinute: 100,
				currentRequests: 0,
				lastReset: Date.now(),
			},
			azuredeepseek: {
				requestsPerMinute: 80,
				currentRequests: 0,
				lastReset: Date.now(),
			},
			qwen: {
				requestsPerMinute: 50,
				currentRequests: 0,
				lastReset: Date.now(),
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
		const providerLimits = this.providers[provider];

		try {
			if (this.shouldThrottle(provider)) {
				const waitTime = this.calculateWaitTime(provider);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}

			providerLimits.currentRequests++;
			const result = await task();
			resolve(result);
		} catch (error) {
			reject(error);
		} finally {
			this.queue.shift();
			this.processing = false;
			this.processQueue();
		}
	}

	shouldThrottle(provider) {
		const limits = this.providers[provider];
		const now = Date.now();

		if (now - limits.lastReset >= 60000) {
			limits.currentRequests = 0;
			limits.lastReset = now;
			return false;
		}

		return limits.currentRequests >= limits.requestsPerMinute;
	}

	calculateWaitTime(provider) {
		const limits = this.providers[provider];
		return 60000 - (Date.now() - limits.lastReset);
	}
}

module.exports = new RateLimiter();
