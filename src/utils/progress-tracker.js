/**
 * Enhanced progress tracking for monitoring translation and processing operations
 * with improved ETA calculation and detailed statistics
 */
class ProgressTracker {
	constructor(options = {}) {
		this.logToConsole = options.logToConsole !== false;
		this.logFrequency = options.logFrequency || 20; // How many times to log during process
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

		// Check if already completed
		if (this.isCompleted) {
			// Silently ignore instead of console warning to avoid cluttering output
			return;
		}

		// Update counts
		this.completed++;
		if (type === "success") this.success++;
		else if (type === "failed") this.failed++;

		// Make sure counts are valid
		this.completed = Math.min(this.total, Math.max(0, this.completed));
		this.success = Math.min(this.completed, Math.max(0, this.success));
		this.failed = Math.min(this.completed, Math.max(0, this.failed));

		// Calculate time since last update
		const now = Date.now();
		const timeSinceLastUpdate = now - this.lastUpdateTime;
		this.lastUpdateTime = now;

		// Keep track of recent operation times (for more accurate ETA)
		this.recentOperationTimes.push(timeSinceLastUpdate);
		if (this.recentOperationTimes.length > 10) {
			this.recentOperationTimes.shift(); // Keep only last 10
		}

		// Update statistics
		this._updateStatistics();

		// Log progress periodically or for first/last items
		if (this.logToConsole && (
			this.completed % Math.max(1, Math.floor(this.total / this.logFrequency)) === 0 || // Log based on frequency
			this.completed === 1 || // First item
			this.completed === this.total // Last item
		)) {
			this._logProgress();
		}

		// Check if completed
		if (this.completed >= this.total) {
			this.endTime = Date.now();
			this.isCompleted = true;
			if (this.logToConsole) {
				this._finalReport();
			}
		}
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
		const percentComplete = Math.min(100, Math.max(0, (this.completed / this.total) * 100 || 0));
		
		// Make sure success rate is between 0-100
		const successRate = this.completed > 0 ? 
			Math.min(100, Math.max(0, (this.success / this.completed) * 100)) : 0;

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

		// Create a progress bar
		const width = 20;
		const filledWidth = Math.max(0, Math.round((this.completed / this.total) * width));
		const emptyWidth = Math.max(0, width - filledWidth);
		const progressBar = `[${"=".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;

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

		// Format current status with consistent field widths to prevent jumping text
		const langInfo = this.language ? `[${this.language}] ` : "";
		const percentText = `${percent.toFixed(1)}%`.padStart(6);
		const itemsText = `${this.completed}/${this.total}`.padEnd(10);
		const successText = `✅ ${this.success}`.padEnd(8);
		const failedText = `❌ ${this.failed}`.padEnd(8);
		const timeText = `⏱️ ${elapsed.toFixed(1)}s`.padEnd(10);
		
		console.log(
			`${langInfo}${progressBar} ${percentText} | ${itemsText}items | ` +
			`${successText}| ${failedText}| ${timeText}${etaText}`
		);
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
