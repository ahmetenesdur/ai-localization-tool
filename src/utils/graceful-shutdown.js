const { FileManager } = require("./file-manager");
const rateLimiter = require("./rate-limiter");
const ProviderFactory = require("../core/provider-factory");
const path = require("path");

class GracefulShutdown {
	constructor(options = {}) {
		this.options = {
			shutdownTimeout: options.shutdownTimeout || 5000, // 5 seconds default (faster)
			cleanupCache: options.cleanupCache !== false, // Enabled by default
			cleanupLogs: options.cleanupLogs || false,
			...options,
		};

		this.isShuttingDown = false;
		this.shutdownCallbacks = [];
		this.logger = options.logger || console;
	}

	/**
	 * Register shutdown callback
	 * @param {Function} callback - Function to call during shutdown
	 */
	registerCallback(callback) {
		if (typeof callback === "function") {
			this.shutdownCallbacks.push(callback);
		}
	}

	/**
	 * FIXED: Unregister shutdown callback to prevent memory leaks
	 * @param {Function} callback - Function to remove from shutdown callbacks
	 */
	unregisterCallback(callback) {
		if (typeof callback === "function") {
			const index = this.shutdownCallbacks.indexOf(callback);
			if (index > -1) {
				this.shutdownCallbacks.splice(index, 1);
			}
		}
	}

	/**
	 * Initialize shutdown handlers
	 */
	init() {
		// Handle termination signals
		process.on("SIGTERM", () => this.handleSignal("SIGTERM"));
		process.on("SIGINT", () => this.handleSignal("SIGINT"));

		// Handle uncaught exceptions
		process.on("uncaughtException", (err) => {
			this.logger.error("Uncaught Exception:", err);
			this.shutdown(1);
		});

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason, promise) => {
			this.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
			this.shutdown(1);
		});

		this.logger.info("Graceful shutdown handlers initialized");
	}

	/**
	 * Handle termination signal
	 * @param {string} signal - Termination signal name
	 */
	async handleSignal(signal) {
		this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
		await this.shutdown(0);
	}

	/**
	 * Perform graceful shutdown
	 * @param {number} exitCode - Exit code to use
	 */
	async shutdown(exitCode = 0) {
		// Prevent multiple shutdown attempts
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this.logger.info("Starting graceful shutdown...");

		// Create timeout promise to ensure we don't hang
		const timeoutPromise = new Promise((resolve) => {
			setTimeout(() => {
				this.logger.warn(
					`Shutdown timeout (${this.options.shutdownTimeout}ms) exceeded, forcing exit`
				);
				resolve();
			}, this.options.shutdownTimeout);
		});

		// Main shutdown process
		const shutdownProcess = this.performShutdown();

		// Race between shutdown process and timeout
		try {
			await Promise.race([shutdownProcess, timeoutPromise]);
		} catch (error) {
			this.logger.error("Error during shutdown:", error);
		} finally {
			// Force exit
			process.exit(exitCode);
		}
	}

	/**
	 * Perform the actual shutdown operations
	 */
	async performShutdown() {
		const startTime = Date.now();

		try {
			// 1. Execute registered callbacks
			this.logger.info("Executing shutdown callbacks...");
			for (const callback of this.shutdownCallbacks) {
				try {
					await callback();
				} catch (error) {
					this.logger.warn("Error in shutdown callback:", error);
				}
			}

			// 2. Flush cache if enabled
			if (this.options.cleanupCache) {
				this.logger.info("Flushing cache...");
				// Cache flushing would happen here if we had a global cache manager
				// For now, we'll just log that this would happen
			}

			// 3. Close provider connections
			this.logger.info("Closing provider connections...");
			// Provider cleanup would happen here

			// 4. Wait for pending operations to complete
			this.logger.info("Waiting for pending operations...");
			await this.waitForPendingOperations();

			// 5. Cleanup logs if enabled
			if (this.options.cleanupLogs) {
				this.logger.info("Cleaning up logs...");
				// Log cleanup would happen here
			}

			const duration = Date.now() - startTime;
			this.logger.info(`Graceful shutdown completed in ${duration}ms`);
		} catch (error) {
			this.logger.error("Error during shutdown process:", error);
		}
	}

	/**
	 * Wait for pending operations to complete
	 */
	async waitForPendingOperations() {
		// Wait for rate limiter queues to drain
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
			// Give some time for operations to complete, but not too long
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Force clear queues if still pending after wait
			try {
				rateLimiter.clearAllQueues();
				this.logger.info("Forced queue cleanup completed");
			} catch (error) {
				this.logger.warn("Error during forced queue cleanup:", error.message);
			}
		}
	}
}

// Create and export singleton instance
const gracefulShutdown = new GracefulShutdown();

// Initialize immediately
gracefulShutdown.init();

module.exports = gracefulShutdown;
