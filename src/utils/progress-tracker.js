/**
 * Enhanced progress tracking for monitoring translation and processing operations
 * with improved ETA calculation and detailed statistics
 */

const CONSTANTS = require("./constants");

class ProgressTracker {
	constructor(options = {}) {
		this.logToConsole = options.logToConsole !== false;
		this.logFrequency =
			options.logFrequency || CONSTANTS.PROGRESS_TRACKER.DEFAULT_LOG_FREQUENCY;

		this._isUpdating = false;
		this._pendingUpdates = [];

		this.reset();
	}

	reset() {
		this.total = 0;
		this.completed = 0;
		this.success = 0;
		this.failed = 0;
		this.startTime = null;
		this.endTime = null;
		this.lastUpdateTime = null;
		this.recentOperationTimes = [];
		this.language = null;
		this.isCompleted = false;

		this._isUpdating = false;
		this._pendingUpdates = [];

		this.statistics = {
			avgTimePerItem: 0,
			totalTime: 0,
			estimatedTimeRemaining: 0,
			itemsPerSecond: 0,
			percentComplete: 0,
			successRate: 0,
		};
	}

	start(total, language = null) {
		this.reset();
		this.total = Math.max(0, total);
		this.startTime = Date.now();
		this.lastUpdateTime = Date.now();
		this.language = language;
		this.isCompleted = false;

		// Immediately log start info
		if (this.logToConsole && this.total > 0) {
			this._logProgress();
		}
	}

	increment(type = "success") {
		if (!this.startTime) {
			throw new Error("Progress tracker not started");
		}

		// Early return if already completed (thread-safe check)
		if (this.isCompleted) {
			return;
		}

		// If currently updating, queue this update
		if (this._isUpdating) {
			this._pendingUpdates.push({ type, timestamp: Date.now() });
			return;
		}

		// Process this update atomically
		this._processUpdate(type);
	}

	_processUpdate(type) {
		// Set lock
		this._isUpdating = true;

		try {
			// Early return if completed during the wait
			if (this.isCompleted) {
				return;
			}

			// Atomic counter updates
			const previousCompleted = this.completed;
			this.completed = Math.min(this.total, this.completed + 1);

			// Only update success/failed if we actually incremented
			if (this.completed > previousCompleted) {
				if (type === "success") {
					this.success = Math.min(this.completed, this.success + 1);
				} else if (type === "failed") {
					this.failed = Math.min(this.completed, this.failed + 1);
				}
			}

			// Ensure data consistency
			this._ensureDataConsistency();

			// Calculate time since last update
			const now = Date.now();
			const timeSinceLastUpdate = now - this.lastUpdateTime;
			this.lastUpdateTime = now;

			// Keep track of recent operation times (for more accurate ETA)
			this.recentOperationTimes.push(timeSinceLastUpdate);
			if (
				this.recentOperationTimes.length > CONSTANTS.PROGRESS_TRACKER.MAX_RECENT_OPERATIONS
			) {
				this.recentOperationTimes.shift(); // Keep only last 10
			}

			// Update statistics
			this._updateStatistics();

			// Log progress periodically or for first/last items
			if (this.logToConsole && this._shouldLog()) {
				this._logProgress();
			}

			// Check if completed
			if (this.completed >= this.total && !this.isCompleted) {
				this.endTime = Date.now();
				this.isCompleted = true;
				if (this.logToConsole) {
					this._finalReport();
				}
			}
		} finally {
			// Release lock
			this._isUpdating = false;

			// Process any pending updates
			this._processPendingUpdates();
		}
	}

	_ensureDataConsistency() {
		// Ensure counts don't exceed limits
		this.completed = Math.min(this.total, Math.max(0, this.completed));
		this.success = Math.min(this.completed, Math.max(0, this.success));
		this.failed = Math.min(this.completed, Math.max(0, this.failed));

		// Ensure success + failed = completed
		const totalCounted = this.success + this.failed;
		if (totalCounted > this.completed) {
			// Adjust to maintain consistency (prioritize success)
			if (this.success > this.completed) {
				this.success = this.completed;
				this.failed = 0;
			} else {
				this.failed = this.completed - this.success;
			}
		}
	}

	_processPendingUpdates() {
		if (this._pendingUpdates.length === 0) {
			return;
		}

		// Process all pending updates in batch
		setImmediate(() => {
			while (this._pendingUpdates.length > 0 && !this._isUpdating) {
				const { type } = this._pendingUpdates.shift();
				this._processUpdate(type);
			}
		});
	}

	_shouldLog() {
		return (
			this.completed % Math.max(1, Math.floor(this.total / this.logFrequency)) === 0 || // Log based on frequency
			this.completed === CONSTANTS.PROGRESS_TRACKER.FIRST_ITEM_THRESHOLD || // First item
			this.completed === this.total // Last item
		);
	}

	_updateStatistics() {
		const elapsed = Date.now() - this.startTime;
		const averageTime = this.completed > 0 ? elapsed / this.completed : 0;

		// Use recent operations for ETA if we have enough data
		let recentAverage = 0;
		if (this.recentOperationTimes.length >= 3) {
			recentAverage =
				this.recentOperationTimes.reduce((a, b) => a + b, 0) /
				this.recentOperationTimes.length;
		} else {
			recentAverage = averageTime;
		}

		// Calculate remaining time using the more accurate of the two averages
		const remaining = Math.max(0, this.total - this.completed);
		const estimatedTimeRemaining = remaining * Math.min(averageTime, recentAverage);

		// Make sure percentComplete is between 0-100
		const percentComplete = Math.min(
			CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER,
			Math.max(
				0,
				(this.completed / this.total) * CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER ||
					0
			)
		);

		// Make sure success rate is between 0-100
		const successRate =
			this.completed > 0
				? Math.min(
						CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER,
						Math.max(
							0,
							(this.success / this.completed) *
								CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER
						)
					)
				: 0;

		this.statistics = {
			avgTimePerItem: averageTime,
			recentAvgTimePerItem: recentAverage,
			totalTime: elapsed / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS, // in seconds
			estimatedTimeRemaining:
				estimatedTimeRemaining / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS, // in seconds
			itemsPerSecond:
				this.completed > 0
					? this.completed / (elapsed / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS)
					: 0,
			percentComplete: percentComplete,
			successRate: successRate,
			startTime: new Date(this.startTime).toISOString(),
			estimatedEndTime: new Date(Date.now() + estimatedTimeRemaining).toISOString(),
		};
	}

	_logProgress() {
		const percent =
			(this.completed / this.total) * CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER;
		const elapsed = (Date.now() - this.startTime) / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS;

		// Create a progress bar
		const width = CONSTANTS.PROGRESS_TRACKER.PROGRESS_BAR_WIDTH;
		const filledWidth = Math.max(0, Math.round((this.completed / this.total) * width));
		const emptyWidth = Math.max(0, width - filledWidth);
		const progressBar = `[${"=".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;

		// Format ETA
		let etaText = "";
		if (this.completed > 0 && this.completed < this.total) {
			const eta = this.statistics.estimatedTimeRemaining;
			if (eta < CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_MINUTE) {
				etaText = `ETA: ${Math.round(eta)}s`;
			} else if (eta < CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_HOUR) {
				etaText = `ETA: ${Math.floor(eta / CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_MINUTE)}m ${Math.round(eta % CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_MINUTE)}s`;
			} else {
				etaText = `ETA: ${Math.floor(eta / CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_HOUR)}h ${Math.floor((eta % CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_HOUR) / CONSTANTS.PROGRESS_TRACKER.SECONDS_IN_MINUTE)}m`;
			}
		}

		// Format current status with consistent field widths to prevent jumping text
		const langInfo = this.language ? `[${this.language}] ` : "";
		const percentText =
			`${percent.toFixed(CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_PRECISION)}%`.padStart(6);
		const itemsText = `${this.completed}/${this.total}`.padEnd(
			CONSTANTS.PROGRESS_TRACKER.TIME_DISPLAY_PADDING
		);
		const successText = `✅ ${this.success}`.padEnd(8);
		const failedText = `❌ ${this.failed}`.padEnd(8);
		const timeText = `⏱️ ${elapsed.toFixed(CONSTANTS.PROGRESS_TRACKER.TIME_PRECISION)}s`.padEnd(
			CONSTANTS.PROGRESS_TRACKER.TIME_DISPLAY_PADDING
		);

		console.log(
			`${langInfo}${progressBar} ${percentText} | ${itemsText}items | ` +
				`${successText}| ${failedText}| ${timeText}${etaText}`
		);
	}

	_finalReport() {
		const totalTime =
			(this.endTime - this.startTime) / CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS;
		const avgTimePerItem = totalTime / this.total;
		const successRate =
			(this.success / this.total) * CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_MULTIPLIER;

		console.log(`\n📊 Translation Summary:`);
		console.log(`🔤 Language: ${this.language || "Unknown"}`);
		console.log(`🔢 Total Items: ${this.total}`);
		console.log(
			`✅ Successful: ${this.success} (${successRate.toFixed(CONSTANTS.PROGRESS_TRACKER.PERCENTAGE_PRECISION)}%)`
		);
		console.log(`❌ Failed: ${this.failed}`);
		console.log(
			`⏱️ Total Time: ${totalTime.toFixed(CONSTANTS.PROGRESS_TRACKER.SPEED_PRECISION)}s`
		);
		console.log(
			`⚡ Average Speed: ${(this.total / totalTime).toFixed(CONSTANTS.PROGRESS_TRACKER.SPEED_PRECISION)} items/second`
		);
		console.log(
			`📏 Average Time per Item: ${(avgTimePerItem * CONSTANTS.PROGRESS_TRACKER.MS_TO_SECONDS).toFixed(CONSTANTS.PROGRESS_TRACKER.AVG_TIME_PRECISION)}ms`
		);
	}

	// Get a snapshot of the current progress
	getStatus() {
		return {
			total: this.total,
			completed: this.completed,
			success: this.success,
			failed: this.failed,
			language: this.language,
			inProgress: this.startTime && !this.isCompleted,
			statistics: { ...this.statistics },
		};
	}

	// Allow disabling console output after creation
	setLogToConsole(value) {
		this.logToConsole = value;
	}
}

module.exports = ProgressTracker;
