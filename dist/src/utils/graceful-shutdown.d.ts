interface GracefulShutdownOptions {
    shutdownTimeout?: number;
    cleanupCache?: boolean;
    cleanupLogs?: boolean;
    logger?: Console;
}
/**
 * Graceful shutdown handler for the application
 */
export declare class GracefulShutdown {
    private options;
    private isShuttingDown;
    private shutdownCallbacks;
    private logger;
    constructor(options?: GracefulShutdownOptions);
    /**
     * Register shutdown callback
     * @param callback - Function to call during shutdown
     */
    registerCallback(callback: () => Promise<void> | void): void;
    /**
     * Unregister shutdown callback to prevent memory leaks
     * @param callback - Function to remove from shutdown callbacks
     */
    unregisterCallback(callback: () => Promise<void> | void): void;
    /**
     * Initialize shutdown handlers
     */
    init(): void;
    /**
     * Handle termination signal
     * @param signal - Termination signal name
     */
    handleSignal(signal: string): Promise<void>;
    /**
     * Perform graceful shutdown
     * @param exitCode - Exit code to use
     */
    shutdown(exitCode?: number): Promise<void>;
    /**
     * Perform the actual shutdown operations
     */
    performShutdown(): Promise<void>;
    /**
     * Wait for pending operations to complete
     */
    waitForPendingOperations(): Promise<void>;
}
declare const gracefulShutdown: GracefulShutdown;
export default gracefulShutdown;
//# sourceMappingURL=graceful-shutdown.d.ts.map