class ProgressTracker {
	constructor() {
		this.totalItems = 0;
		this.completedItems = 0;
		this.startTime = null;
		this.statistics = {
			success: 0,
			failed: 0,
			cached: 0,
		};
	}

	start(total) {
		this.totalItems = total;
		this.completedItems = 0;
		this.startTime = Date.now();
	}

	increment(status) {
		this.completedItems++;
		if (status in this.statistics) {
			this.statistics[status]++;
		}
		this.displayProgress();
	}

	displayProgress() {
		const percent = Math.round(
			(this.completedItems / this.totalItems) * 100
		);
		const elapsedTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

		process.stdout.write(
			`\rProgress: ${percent}% | ${this.completedItems}/${this.totalItems} | ${elapsedTime}s`
		);

		if (this.completedItems === this.totalItems) {
			this.displaySummary();
		}
	}

	displaySummary() {
		console.log("\n\nTranslation Summary:");
		console.log(`✓ Successful: ${this.statistics.success}`);
		console.log(`⚡ From Cache: ${this.statistics.cached}`);
		console.log(`✕ Failed: ${this.statistics.failed}`);
		console.log(
			`⏱ Total Time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`
		);
	}
}

module.exports = ProgressTracker;
