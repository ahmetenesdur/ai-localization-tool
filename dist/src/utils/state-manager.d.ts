interface StateManagerOptions {
    stateFileName?: string;
    stateDir?: string;
}
interface StateComparisonResult {
    deletedKeys: string[];
    modifiedKeys: string[];
    newKeys: string[];
    hasChanges: boolean;
}
interface ComparisonStats {
    totalChanges: number;
    deletedCount: number;
    modifiedCount: number;
    newCount: number;
    hasChanges: boolean;
}
interface StateMetadata {
    lastUpdated: string;
    version: string;
    toolVersion: string;
}
interface StateWithMetadata {
    [key: string]: string | StateMetadata | undefined;
    _metadata?: StateMetadata;
}
/**
 * StateManager - Tracks changes in source locale files using hash-based state management
 * This enables detection of deleted/modified keys to synchronize target locale files
 */
declare class StateManager {
    private options;
    constructor(options?: StateManagerOptions);
    /**
     * Generate a SHA-256 hash for given text content
     * @param text - Text content to hash
     * @returns SHA-256 hash in hexadecimal format
     */
    private _generateHash;
    /**
     * Get the full path to the state file
     * @param projectRoot - Project root directory
     * @returns Full path to state file
     */
    private _getStateFilePath;
    /**
     * Load previous state from state file
     * @param projectRoot - Project root directory
     * @returns Previous state object or empty object if file doesn't exist
     */
    loadState(projectRoot: string): Promise<StateWithMetadata>;
    /**
     * Save current state to state file
     * @param projectRoot - Project root directory
     * @param state - State object to save
     * @returns Success status
     */
    saveState(projectRoot: string, state: StateWithMetadata): Promise<boolean>;
    /**
     * Generate state object from source content by creating hashes for each key
     * @param sourceContent - Flattened source locale content
     * @returns State object with key-hash pairs
     */
    generateStateFromSource(sourceContent: Record<string, string>): Record<string, string>;
    /**
     * Compare two states and identify changes
     * @param previousState - Previous state object
     * @param currentState - Current state object
     * @returns Object containing arrays of deleted, modified, and new keys
     */
    compareStates(previousState: StateWithMetadata, currentState: StateWithMetadata): StateComparisonResult;
    /**
     * Get statistics about the state comparison
     * @param comparison - Result from compareStates method
     * @returns Statistics object
     */
    getComparisonStats(comparison: StateComparisonResult): ComparisonStats;
    /**
     * Clean up old state files (maintenance utility)
     * @param projectRoot - Project root directory
     * @returns Success status
     */
    cleanupState(projectRoot: string): Promise<boolean>;
}
export default StateManager;
export type { StateManager, StateManagerOptions, StateComparisonResult, ComparisonStats, StateWithMetadata, };
//# sourceMappingURL=state-manager.d.ts.map