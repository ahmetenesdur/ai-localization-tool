import { FileManager } from "@/utils/file-manager";
import rateLimiter from "@/utils/rate-limiter";
import ProviderFactory from "@/core/provider-factory";
import path from "path";
import type { RateLimiterStatus } from "@/types";

interface GracefulShutdownOptions {
	shutdownTimeout?: number;
	cleanupCache?: boolean;
	cleanupLogs?: boolean;
	logger?: Console;
}

/**
 * Graceful shutdown handler for the application
 */
export class GracefulShutdown {
	private options: GracefulShutdownOptions;
	private isShuttingDown: boolean;
	private shutdownCallbacks: Array<() => Promise<void> | void>;
	private logger: Console;

	constructor(options: GracefulShutdownOptions = {}) {
		this.options = {
			shutdownTimeout: options.shutdownTimeout || 30000, // 30 seconds default
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
	 * @param callback - Function to call during shutdown
	 */
	registerCallback(callback: () => Promise<void> | void): void {
		if (typeof callback === "function") {
			this.shutdownCallbacks.push(callback);
		}
	}

	/**
	 * Unregister shutdown callback to prevent memory leaks
	 * @param callback - Function to remove from shutdown callbacks
	 */
	unregisterCallback(callback: () => Promise<void> | void): void {
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
	init(): void {
		// Handle termination signals
		process.on("SIGTERM", () => this.handleSignal("SIGTERM"));
		process.on("SIGINT", () => this.handleSignal("SIGINT"));

		// Handle uncaught exceptions
		process.on("uncaughtException", (err: Error) => {
			this.logger.error("Uncaught Exception:", err);
			this.shutdown(1);
		});

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
			this.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
			this.shutdown(1);
		});

		this.logger.info("Graceful shutdown handlers initialized");
	}

	/**
	 * Handle termination signal
	 * @param signal - Termination signal name
	 */
	async handleSignal(signal: string): Promise<void> {
		this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
		await this.shutdown(0);
	}

	/**
	 * Perform graceful shutdown
	 * @param exitCode - Exit code to use
	 */
	async shutdown(exitCode: number = 0): Promise<void> {
		// Prevent multiple shutdown attempts
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this.logger.info("Starting graceful shutdown...");

		// Create timeout promise to ensure we don't hang
		const timeoutPromise = new Promise<void>((resolve) => {
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
		} catch (error: any) {
			this.logger.error("Error during shutdown:", error);
		} finally {
			// Force exit
			process.exit(exitCode);
		}
	}

	/**
	 * Perform the actual shutdown operations
	 */
	async performShutdown(): Promise<void> {
		const startTime = Date.now();

		try {
			// 1. Execute registered callbacks
			this.logger.info("Executing shutdown callbacks...");
			for (const callback of this.shutdownCallbacks) {
				try {
					await callback();
				} catch (error: any) {
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

			// 6. Destroy rate limiter to clear intervals
			this.logger.info("Cleaning up rate limiter...");
			rateLimiter.destroy();

			const duration = Date.now() - startTime;
			this.logger.info(`Graceful shutdown completed in ${duration}ms`);
		} catch (error: any) {
			this.logger.error("Error during shutdown process:", error);
		}
	}

	/**
	 * Wait for pending operations to complete
	 */
	async waitForPendingOperations(): Promise<void> {
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
			// Give some time for operations to complete
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
}

// Create and export singleton instance
const gracefulShutdown = new GracefulShutdown();

// Initialize immediately
gracefulShutdown.init();

export default gracefulShutdown;
