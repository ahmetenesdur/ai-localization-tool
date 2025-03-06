class ProgressTracker {
	constructor() {
		this.totalItems = 0;
		this.completedItems = 0;
		this.startTime = null;
		this.currentLang = null;
		this.resetStats();
	}

	resetStats() {
		this.statistics = {
			success: 0,
			failed: 0,
			totalTime: 0,
		};
	}

	start(total, targetLang) {
		this.totalItems = total;
		this.completedItems = 0;
		this.startTime = Date.now();
		this.currentLang = targetLang;
		this.resetStats();
	}

	increment(status) {
		this.completedItems++;
		if (status in this.statistics) {
			this.statistics[status]++;
		}
		this.displayProgress();
	}

	displayProgress() {
		const percent = Math.round((this.completedItems / this.totalItems) * 100);
		const elapsedTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
		const progressBar = `[${"■".repeat(Math.floor(percent / 5))}${" ".repeat(20 - Math.floor(percent / 5))}]`;

		process.stdout.write(
			`\r🚀 ${this.currentLang.padEnd(1)} ${progressBar} ` +
				`${percent.toString().padStart(1)}%  ` +
				`✅ ${this.statistics.success.toString().padStart(1)}  ` +
				`❌ ${this.statistics.failed.toString().padStart(1)}  ` +
				`⏳ ${elapsedTime.padStart(1)}s`
		);

		if (this.completedItems === this.totalItems) {
			this.statistics.totalTime = elapsedTime;
			this.displaySummary();
		}
	}

	displaySummary() {
		console.log(`\n📊 Translation Summary for ${this.currentLang}:`);
		console.log(`✅ Success: ${this.statistics.success.toString()}/${this.totalItems}`);
		console.log(`❌ Failed: ${this.statistics.failed.toString()}`);
		console.log(`⏳ Time: ${this.statistics.totalTime}s`);
	}
}

module.exports = ProgressTracker;
