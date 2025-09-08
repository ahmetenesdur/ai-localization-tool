/**
 * Enhanced progress tracking for monitoring translation and processing operations
 * with improved ETA calculation and detailed statistics
 */
interface ProgressOptions {
    logToConsole?: boolean;
    logFrequency?: number;
}
interface ProgressStatistics {
    avgTimePerItem: number;
    recentAvgTimePerItem: number;
    totalTime: number;
    estimatedTimeRemaining: number;
    itemsPerSecond: number;
    percentComplete: number;
    successRate: number;
    startTime: string;
    estimatedEndTime: string;
}
interface ProgressStatus {
    total: number;
    completed: number;
    success: number;
    failed: number;
    language: string | null;
    inProgress: boolean;
    statistics: ProgressStatistics;
}
/**
 * Progress tracker for monitoring translation and processing operations
 */
export declare class ProgressTracker {
    private logToConsole;
    private logFrequency;
    private _isUpdating;
    private _pendingUpdates;
    total: number;
    completed: number;
    success: number;
    failed: number;
    startTime: number | null;
    endTime: number | null;
    lastUpdateTime: number | null;
    recentOperationTimes: number[];
    language: string | null;
    isCompleted: boolean;
    statistics: ProgressStatistics;
    constructor(options?: ProgressOptions);
    reset(): void;
    start(total: number, language?: string | null): void;
    increment(type?: string): void;
    private _processUpdate;
    private _ensureDataConsistency;
    private _processPendingUpdates;
    private _shouldLog;
    private _updateStatistics;
    private _logProgress;
    private _finalReport;
    getStatus(): ProgressStatus;
    setLogToConsole(value: boolean): void;
}
export default ProgressTracker;
//# sourceMappingURL=progress-tracker.d.ts.map