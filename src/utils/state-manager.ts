import * as crypto from "crypto";
import { FileManager } from "@/utils/file-manager";
import * as path from "path";

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
class StateManager {
	private options: Required<StateManagerOptions>;

	constructor(options: StateManagerOptions = {}) {
		this.options = {
			stateFileName: options.stateFileName || "localization.state.json",
			stateDir: options.stateDir || ".localize-cache",
		};
	}

	/**
	 * Generate a SHA-256 hash for given text content
	 * @param text - Text content to hash
	 * @returns SHA-256 hash in hexadecimal format
	 */
	private _generateHash(text: string): string {
		if (typeof text !== "string") {
			text = JSON.stringify(text);
		}
		return crypto.createHash("sha256").update(text, "utf8").digest("hex");
	}

	/**
	 * Get the full path to the state file
	 * @param projectRoot - Project root directory
	 * @returns Full path to state file
	 */
	private _getStateFilePath(projectRoot: string): string {
		const stateDir = path.join(projectRoot, this.options.stateDir);
		return path.join(stateDir, this.options.stateFileName);
	}

	/**
	 * Load previous state from state file
	 * @param projectRoot - Project root directory
	 * @returns Previous state object or empty object if file doesn't exist
	 */
	async loadState(projectRoot: string): Promise<StateWithMetadata> {
		try {
			const stateFilePath = this._getStateFilePath(projectRoot);
			const state = await FileManager.readJSON(stateFilePath);
			// Fix: Ensure we return a proper StateWithMetadata object
			return (state || {}) as StateWithMetadata;
		} catch (error: any) {
			// State file doesn't exist or is corrupted - return empty state
			if (error.message.includes("File read error") || error.code === "ENOENT") {
				return {} as StateWithMetadata;
			}
			throw new Error(`Failed to load state: ${error.message}`);
		}
	}

	/**
	 * Save current state to state file
	 * @param projectRoot - Project root directory
	 * @param state - State object to save
	 * @returns Success status
	 */
	async saveState(projectRoot: string, state: StateWithMetadata): Promise<boolean> {
		try {
			const stateFilePath = this._getStateFilePath(projectRoot);

			// Ensure state directory exists
			const stateDir = path.dirname(stateFilePath);
			await FileManager.ensureDir(stateDir);

			// Get package version - more robust approach
			let version = "1.0.0";
			try {
				// Use a more robust method to find package.json
				const packagePath = path.resolve(__dirname, "../../package.json");
				const packageJson = require(packagePath);
				version = packageJson.version || "1.0.0";
			} catch (versionError) {
				console.warn("Could not read package version, using default:", versionError);
			}

			const stateWithMetadata = {
				...state,
				_metadata: {
					lastUpdated: new Date().toISOString(),
					version: "1.0.0",
					toolVersion: version,
				},
			};

			// Fix: Cast to any to avoid type conflicts
			await FileManager.writeJSON(stateFilePath, stateWithMetadata as any);
			return true;
		} catch (error: any) {
			throw new Error(`Failed to save state: ${error.message}`);
		}
	}

	/**
	 * Generate state object from source content by creating hashes for each key
	 * @param sourceContent - Flattened source locale content
	 * @returns State object with key-hash pairs
	 */
	generateStateFromSource(sourceContent: Record<string, string>): Record<string, string> {
		const state: Record<string, string> = {};

		for (const [key, value] of Object.entries(sourceContent)) {
			// Generate hash for the value content
			state[key] = this._generateHash(value);
		}

		return state;
	}

	/**
	 * Compare two states and identify changes
	 * @param previousState - Previous state object
	 * @param currentState - Current state object
	 * @returns Object containing arrays of deleted, modified, and new keys
	 */
	compareStates(
		previousState: StateWithMetadata,
		currentState: StateWithMetadata
	): StateComparisonResult {
		const deletedKeys: string[] = [];
		const modifiedKeys: string[] = [];
		const newKeys: string[] = [];

		// Remove metadata from comparison if it exists
		const cleanPreviousState = { ...previousState };
		const cleanCurrentState = { ...currentState };
		delete cleanPreviousState._metadata;
		delete cleanCurrentState._metadata;

		// Find deleted keys (exist in previous but not in current)
		for (const key of Object.keys(cleanPreviousState)) {
			if (!(key in cleanCurrentState)) {
				deletedKeys.push(key);
			}
		}

		// Find modified and new keys
		for (const [key, currentHash] of Object.entries(cleanCurrentState)) {
			if (!(key in cleanPreviousState)) {
				// New key
				newKeys.push(key);
			} else if (cleanPreviousState[key] !== currentHash) {
				// Modified key (hash changed)
				modifiedKeys.push(key);
			}
		}

		return {
			deletedKeys,
			modifiedKeys,
			newKeys,
			hasChanges: deletedKeys.length > 0 || modifiedKeys.length > 0 || newKeys.length > 0,
		};
	}

	/**
	 * Get statistics about the state comparison
	 * @param comparison - Result from compareStates method
	 * @returns Statistics object
	 */
	getComparisonStats(comparison: StateComparisonResult): ComparisonStats {
		return {
			totalChanges:
				comparison.deletedKeys.length +
				comparison.modifiedKeys.length +
				comparison.newKeys.length,
			deletedCount: comparison.deletedKeys.length,
			modifiedCount: comparison.modifiedKeys.length,
			newCount: comparison.newKeys.length,
			hasChanges: comparison.hasChanges,
		};
	}

	/**
	 * Clean up old state files (maintenance utility)
	 * @param projectRoot - Project root directory
	 * @returns Success status
	 */
	async cleanupState(projectRoot: string): Promise<boolean> {
		try {
			const stateFilePath = this._getStateFilePath(projectRoot);
			await FileManager.deleteFile(stateFilePath);
			return true;
		} catch (error: any) {
			// File doesn't exist - that's fine
			if (error.message.includes("ENOENT")) {
				return true;
			}
			throw new Error(`Failed to cleanup state: ${error.message}`);
		}
	}
}

export default StateManager;
export type {
	StateManager,
	StateManagerOptions,
	StateComparisonResult,
	ComparisonStats,
	StateWithMetadata,
};
