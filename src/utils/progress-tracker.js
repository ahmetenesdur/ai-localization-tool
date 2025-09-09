/**
 * Enhanced progress tracking for monitoring translation and processing operations
 * with improved ETA calculation and detailed statistics
 */
class ProgressTracker {
	constructor(options = {}) {
		this.logToConsole = options.logToConsole !== false;
		this.logFrequency = options.logFrequency || 1; // Log every update for better visibility

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

		if (this.logToConsole && this.total > 0) {
			this._logProgress();
		}
	}

	increment(type = "success") {
		if (!this.startTime) {
			throw new Error("Progress tracker not started");
		}

		if (this.isCompleted) {
			return;
		}

		if (this._isUpdating) {
			this._pendingUpdates.push({ type, timestamp: Date.now() });
			return;
		}

		this._processUpdate(type);
	}

	_processUpdate(type) {
		this._isUpdating = true;

		try {
			if (this.isCompleted) {
				return;
			}

			const previousCompleted = this.completed;
			this.completed = Math.min(this.total, this.completed + 1);

			if (this.completed > previousCompleted) {
				if (type === "success") {
					this.success = Math.min(this.completed, this.success + 1);
				} else if (type === "failed") {
					this.failed = Math.min(this.completed, this.failed + 1);
				}
			}

			this._ensureDataConsistency();

			const now = Date.now();
			const timeSinceLastUpdate = now - this.lastUpdateTime;
			this.lastUpdateTime = now;

			const MAX_OPERATION_TIMES = 10;
			this.recentOperationTimes.push(timeSinceLastUpdate);
			if (this.recentOperationTimes.length > MAX_OPERATION_TIMES) {
				this.recentOperationTimes.shift(); // Keep only last 10
			}

			this._updateStatistics();

			if (this.logToConsole && this._shouldLog()) {
				this._logProgress();
			}

			if (this.completed >= this.total && !this.isCompleted) {
				this.endTime = Date.now();
				this.isCompleted = true;
				if (this.logToConsole) {
					this._finalReport();
				}
			}
		} finally {
			this._isUpdating = false;

			this._processPendingUpdates();
		}
	}

	_ensureDataConsistency() {
		this.completed = Math.min(this.total, Math.max(0, this.completed));
		this.success = Math.min(this.completed, Math.max(0, this.success));
		this.failed = Math.min(this.completed, Math.max(0, this.failed));

		const totalCounted = this.success + this.failed;
		if (totalCounted > this.completed) {
			if (this.success > this.completed) {
				this.success = this.completed;
				this.failed = 0;
			} else {
				this.failed = this.completed - this.success;
			}
		}
	}

	_processPendingUpdates() {
		if (
			!this._pendingUpdates ||
			!Array.isArray(this._pendingUpdates) ||
			this._pendingUpdates.length === 0
		) {
			return;
		}

		setImmediate(() => {
			while (this._pendingUpdates && this._pendingUpdates.length > 0 && !this._isUpdating) {
				const updateItem = this._pendingUpdates.shift();

				if (updateItem && typeof updateItem === "object" && updateItem.type) {
					this._processUpdate(updateItem.type);
				}
			}
		});
	}

	_shouldLog() {
		if (!this.logToConsole || this.total === 0) return false;

		// Log every update for real-time progress
		return true;
	}

	_updateStatistics() {
		const elapsed = Date.now() - this.startTime;
		const averageTime = this.completed > 0 ? elapsed / this.completed : 0;

		let recentAverage = 0;
		if (this.recentOperationTimes.length >= 3) {
			recentAverage =
				this.recentOperationTimes.reduce((a, b) => a + b, 0) /
				this.recentOperationTimes.length;
		} else {
			recentAverage = averageTime;
		}

		const remaining = Math.max(0, this.total - this.completed);
		const estimatedTimeRemaining = remaining * Math.min(averageTime, recentAverage);

		const percentComplete = Math.min(
			100,
			Math.max(0, (this.completed / this.total) * 100 || 0)
		);

		const successRate =
			this.completed > 0
				? Math.min(100, Math.max(0, (this.success / this.completed) * 100))
				: 0;

		this.statistics = {
			avgTimePerItem: averageTime,
			recentAvgTimePerItem: recentAverage,
			totalTime: elapsed / 1000, // in seconds
			estimatedTimeRemaining: estimatedTimeRemaining / 1000, // in seconds
			itemsPerSecond: this.completed > 0 ? this.completed / (elapsed / 1000) : 0,
			percentComplete: percentComplete,
			successRate: successRate,
			startTime: new Date(this.startTime).toISOString(),
			estimatedEndTime: new Date(Date.now() + estimatedTimeRemaining).toISOString(),
		};
	}

	_logProgress() {
		const percent = (this.completed / this.total) * 100;
		const elapsed = (Date.now() - this.startTime) / 1000;

		// Create a more visible progress bar
		const width = 30;
		const filledWidth = Math.max(0, Math.round((this.completed / this.total) * width));
		const emptyWidth = Math.max(0, width - filledWidth);
		const progressBar = `[${"█".repeat(filledWidth)}${"░".repeat(emptyWidth)}]`;

		// Add loading spinner for active processing
		const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		const spinner =
			this.completed < this.total
				? spinners[Math.floor(Date.now() / 100) % spinners.length]
				: "✅";

		// Format ETA
		let etaText = "";
		if (this.completed > 0 && this.completed < this.total) {
			const eta = this.statistics.estimatedTimeRemaining;
			if (eta < 60) {
				etaText = `ETA: ${Math.round(eta)}s`;
			} else if (eta < 3600) {
				etaText = `ETA: ${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`;
			} else {
				etaText = `ETA: ${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m`;
			}
		}

		const langInfo = this.language ? `🌍 ${this.language.toUpperCase()} ` : "";
		const percentText = `${percent.toFixed(1)}%`.padStart(6);
		const itemsText = `${this.completed}/${this.total}`.padEnd(8);
		const timeText = `${elapsed.toFixed(1)}s`.padEnd(8);
		const statusText = this.completed < this.total ? "🔄 PROCESSING" : "✅ COMPLETED";

		// Clear previous line and show progress
		process.stdout.write("\r\x1b[K");
		process.stdout.write(
			`${spinner} ${langInfo}${progressBar} ${percentText} | ${itemsText} | ⏱️ ${timeText} | ${statusText} ${etaText}`
		);

		// Add newline when completed
		if (this.completed === this.total) {
			process.stdout.write("\n");
		}
	}

	_finalReport() {
		const totalTime = (this.endTime - this.startTime) / 1000;
		const avgTimePerItem = totalTime / this.total;
		const successRate = (this.success / this.total) * 100;

		console.log(`\n📊 Translation Summary:`);
		console.log(`🔤 Language: ${this.language || "Unknown"}`);
		console.log(`🔢 Total Items: ${this.total}`);
		console.log(`✅ Successful: ${this.success} (${successRate.toFixed(1)}%)`);
		console.log(`❌ Failed: ${this.failed}`);
		console.log(`⏱️ Total Time: ${totalTime.toFixed(2)}s`);
		console.log(`⚡ Average Speed: ${(this.total / totalTime).toFixed(2)} items/second`);
		console.log(`📏 Average Time per Item: ${(avgTimePerItem * 1000).toFixed(0)}ms`);
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
