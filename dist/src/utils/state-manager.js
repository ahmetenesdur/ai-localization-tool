"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const file_manager_1 = require("./file-manager");
const path = __importStar(require("path"));
/**
 * StateManager - Tracks changes in source locale files using hash-based state management
 * This enables detection of deleted/modified keys to synchronize target locale files
 */
class StateManager {
    constructor(options = {}) {
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
    _generateHash(text) {
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
    _getStateFilePath(projectRoot) {
        const stateDir = path.join(projectRoot, this.options.stateDir);
        return path.join(stateDir, this.options.stateFileName);
    }
    /**
     * Load previous state from state file
     * @param projectRoot - Project root directory
     * @returns Previous state object or empty object if file doesn't exist
     */
    async loadState(projectRoot) {
        try {
            const stateFilePath = this._getStateFilePath(projectRoot);
            const state = await file_manager_1.FileManager.readJSON(stateFilePath);
            // Fix: Ensure we return a proper StateWithMetadata object
            return (state || {});
        }
        catch (error) {
            // State file doesn't exist or is corrupted - return empty state
            if (error.message.includes("File read error") || error.code === "ENOENT") {
                return {};
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
    async saveState(projectRoot, state) {
        try {
            const stateFilePath = this._getStateFilePath(projectRoot);
            // Ensure state directory exists
            const stateDir = path.dirname(stateFilePath);
            await file_manager_1.FileManager.ensureDir(stateDir);
            // Get package version - more robust approach
            let version = "1.0.0";
            try {
                // Use a more robust method to find package.json
                const packagePath = path.resolve(__dirname, "../../../package.json");
                const packageJson = require(packagePath);
                version = packageJson.version || "1.0.0";
            }
            catch (versionError) {
                console.warn("Could not read package version, using default:", versionError);
                // Try alternative approach to get version
                try {
                    const packageJson = require("../../package.json");
                    version = packageJson.version || "1.0.0";
                }
                catch (fallbackError) {
                    console.warn("Fallback method also failed:", fallbackError);
                }
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
            await file_manager_1.FileManager.writeJSON(stateFilePath, stateWithMetadata);
            return true;
        }
        catch (error) {
            throw new Error(`Failed to save state: ${error.message}`);
        }
    }
    /**
     * Generate state object from source content by creating hashes for each key
     * @param sourceContent - Flattened source locale content
     * @returns State object with key-hash pairs
     */
    generateStateFromSource(sourceContent) {
        const state = {};
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
    compareStates(previousState, currentState) {
        const deletedKeys = [];
        const modifiedKeys = [];
        const newKeys = [];
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
            }
            else if (cleanPreviousState[key] !== currentHash) {
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
    getComparisonStats(comparison) {
        return {
            totalChanges: comparison.deletedKeys.length +
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
    async cleanupState(projectRoot) {
        try {
            const stateFilePath = this._getStateFilePath(projectRoot);
            await file_manager_1.FileManager.deleteFile(stateFilePath);
            return true;
        }
        catch (error) {
            // File doesn't exist - that's fine
            if (error.message.includes("ENOENT")) {
                return true;
            }
            throw new Error(`Failed to cleanup state: ${error.message}`);
        }
    }
}
exports.default = StateManager;
//# sourceMappingURL=state-manager.js.map