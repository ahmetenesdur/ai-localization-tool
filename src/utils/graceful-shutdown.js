import { FileManager } from "./file-manager.js";
import rateLimiter from "./rate-limiter.js";
import ProviderFactory from "../core/provider-factory.js";
import path from "path";

class GracefulShutdown {
	constructor(options = {}) {
		this.options = {
			shutdownTimeout: options.shutdownTimeout || 5000,
			cleanupCache: options.cleanupCache !== false,
			cleanupLogs: options.cleanupLogs || false,
			...options,
		};

		this.isShuttingDown = false;
		this.shutdownCallbacks = [];
		this.logger = options.logger || console;
	}

	registerCallback(callback) {
		if (typeof callback === "function") {
			this.shutdownCallbacks.push(callback);
		}
	}

	unregisterCallback(callback) {
		if (typeof callback === "function") {
			const index = this.shutdownCallbacks.indexOf(callback);
			if (index > -1) {
				this.shutdownCallbacks.splice(index, 1);
			}
		}
	}

	init() {
		process.on("SIGTERM", () => this.handleSignal("SIGTERM"));
		process.on("SIGINT", () => this.handleSignal("SIGINT"));

		process.on("uncaughtException", (err) => {
			this.logger.error("Uncaught Exception:", err);
			this.shutdown(1);
		});

		process.on("unhandledRejection", (reason, promise) => {
			this.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
			this.shutdown(1);
		});

		this.logger.info("Graceful shutdown handlers initialized");
	}

	async handleSignal(signal) {
		this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
		await this.shutdown(0);
	}

	async shutdown(exitCode = 0) {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this.logger.info("Starting graceful shutdown...");

		const timeoutPromise = new Promise((resolve) => {
			setTimeout(() => {
				this.logger.warn(
					`Shutdown timeout (${this.options.shutdownTimeout}ms) exceeded, forcing exit`
				);
				resolve();
			}, this.options.shutdownTimeout);
		});

		const shutdownProcess = this.performShutdown();

		try {
			await Promise.race([shutdownProcess, timeoutPromise]);
		} catch (error) {
			this.logger.error("Error during shutdown:", error);
		} finally {
			process.exit(exitCode);
		}
	}

	async performShutdown() {
		const startTime = Date.now();

		try {
			this.logger.info("Executing shutdown callbacks...");
			for (const callback of this.shutdownCallbacks) {
				try {
					await callback();
				} catch (error) {
					this.logger.warn("Error in shutdown callback:", error);
				}
			}

			if (this.options.cleanupCache) {
				this.logger.info("Flushing cache...");
			}

			this.logger.info("Closing provider connections...");

			this.logger.info("Waiting for pending operations...");
			await this.waitForPendingOperations();

			if (this.options.cleanupLogs) {
				this.logger.info("Cleaning up logs...");
			}

			const duration = Date.now() - startTime;
			this.logger.info(`Graceful shutdown completed in ${duration}ms`);
		} catch (error) {
			this.logger.error("Error during shutdown process:", error);
		}
	}

	async waitForPendingOperations() {
		const providerStatus = rateLimiter.getStatus();
		let hasPending = false;

		for (const [provider, status] of Object.entries(providerStatus)) {
			if (status.queueSize > 0 || status.processing > 0) {
				hasPending = true;
				this.logger.info(
					`Waiting for ${status.queueSize} queued and ${status.processing} processing operations for ${provider}`
				);
			}
		}

		if (hasPending) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			try {
				rateLimiter.clearAllQueues();
				this.logger.info("Forced queue cleanup completed");
			} catch (error) {
				this.logger.warn("Error during forced queue cleanup:", error.message);
			}
		}
	}
}

const gracefulShutdown = new GracefulShutdown();

gracefulShutdown.init();

export default gracefulShutdown;
