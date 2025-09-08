import type { RateLimiterStatus, ProviderLimits } from "../types";
export interface RateLimiterOptions {
    queueStrategy?: "fifo" | "priority";
    queueTimeout?: number;
    adaptiveThrottling?: boolean;
    providerLimits?: Record<string, ProviderLimits>;
}
export declare class RateLimiter {
    private queues;
    private processing;
    private config;
    private metrics;
    private providers;
    private _processingLocks?;
    private _intervals;
    constructor(config?: RateLimiterOptions);
    /**
     * Cleanup method to clear all intervals and allow process to exit
     */
    destroy(): void;
    /**
     * Update config options
     */
    updateConfig(config: RateLimiterOptions): void;
    enqueue<T>(provider: string, task: () => Promise<T>, priority?: number): Promise<T>;
    private _processQueue;
    private _shouldThrottle;
    private _calculateWaitTime;
    private _resetCounters;
    private _cleanupMetrics;
    private _adjustThrottling;
    private _trackResponseTime;
    private _trackErrorRate;
    getQueueSize(provider: string): number;
    getStatus(): Record<string, RateLimiterStatus>;
    getConfig(): Required<Pick<RateLimiterOptions, "queueStrategy" | "queueTimeout" | "adaptiveThrottling">>;
}
declare const _default: RateLimiter;
export default _default;
//# sourceMappingURL=rate-limiter.d.ts.map