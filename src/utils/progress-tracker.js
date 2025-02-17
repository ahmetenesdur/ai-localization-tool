class ProgressTracker {
	constructor() {
		this.totalItems = 0;
		this.completedItems = 0;
		this.startTime = null;
		this.statistics = {
			success: 0,
			failed: 0,
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
			`\r🔄 Progress: ${percent}% | ${this.completedItems}/${this.totalItems} files | ⏱️ ${elapsedTime}s`
		);

		if (this.completedItems === this.totalItems) {
			this.displaySummary();
		}
	}

	displaySummary() {
		console.log("\n\n📊 Translation Summary:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`✅ Successful: ${this.statistics.success}`);
		console.log(`❌ Failed: ${this.statistics.failed}`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(
			`⏱️  Total Time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s\n`
		);
	}
}

module.exports = ProgressTracker;
