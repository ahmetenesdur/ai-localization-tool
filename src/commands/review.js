/**
 * Interactive Review Command
 * Allows manual review of low-confidence translations
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import ConfidenceScorer from "../utils/confidence-scorer.js";

class ReviewCommand {
	constructor(config) {
		this.config = config;
		this.reviewQueue = [];
		this.currentIndex = 0;
		this.decisions = {
			accepted: [],
			edited: [],
			rejected: [],
			skipped: [],
		};
	}

	/**
	 * Load review queue from file
	 */
	loadReviewQueue() {
		const reviewFile = path.join(process.cwd(), ".localize-cache", "review-queue.json");

		if (!fs.existsSync(reviewFile)) {
			console.log("\n❌ No review queue found.");
			console.log(
				"   Run translation with confidence scoring first: localize translate --min-confidence 0.8"
			);
			return false;
		}

		try {
			const data = JSON.parse(fs.readFileSync(reviewFile, "utf8"));
			this.reviewQueue = data.items || [];
			console.log(`\n📋 Loaded ${this.reviewQueue.length} items for review\n`);
			return true;
		} catch (error) {
			console.error(`❌ Error loading review queue: ${error.message}`);
			return false;
		}
	}

	/**
	 * Start interactive review session
	 */
	async startReview() {
		if (!this.loadReviewQueue()) {
			return;
		}

		if (this.reviewQueue.length === 0) {
			console.log("\n✅ No items need review. All translations meet quality threshold!\n");
			return;
		}

		console.log("━".repeat(70));
		console.log(`📝 Review Queue: ${this.reviewQueue.length} translations need attention`);
		console.log("━".repeat(70));

		for (let i = 0; i < this.reviewQueue.length; i++) {
			this.currentIndex = i;
			const item = this.reviewQueue[i];

			const decision = await this.reviewItem(item, i + 1, this.reviewQueue.length);

			if (decision === "quit") {
				break;
			}
		}

		this.showSummary();
		this.saveDecisions();
	}

	/**
	 * Review a single translation
	 */
	async reviewItem(item, current, total) {
		console.log(`\n[${current}/${total}] Translation Review`);
		console.log("━".repeat(70));
		console.log(`Key:        ${item.key}`);
		console.log(`Language:   ${item.language}`);
		console.log(
			`Confidence: ${ConfidenceScorer.formatConfidence(item.confidence.score)} (${item.confidence.level})`
		);
		console.log(`Category:   ${item.category || "general"}`);

		console.log(`\nSource:`);
		console.log(`  "${item.source}"`);

		console.log(`\nTranslation:`);
		console.log(`  "${item.translation}"`);

		// Show issues if any
		if (item.confidence.issues && item.confidence.issues.length > 0) {
			console.log(`\nIssues Detected:`);
			item.confidence.issues.forEach((issue) => {
				const icon = issue.severity === "critical" ? "⛔" : "⚠️ ";
				console.log(`  ${icon} ${issue.message}`);
			});
		}

		console.log(`\nActions:`);
		console.log(`  [A] Accept    [E] Edit    [R] Reject    [S] Skip`);
		console.log(`  [N] Next      [Q] Quit    [?] Help`);

		const action = await this.getUserInput("\nYour choice: ");

		return this.handleAction(action.toLowerCase(), item);
	}

	/**
	 * Handle user action
	 */
	async handleAction(action, item) {
		switch (action) {
			case "a":
			case "accept":
				this.decisions.accepted.push(item);
				console.log("✅ Accepted");
				return "continue";

			case "e":
			case "edit":
				const edited = await this.editTranslation(item);
				this.decisions.edited.push(edited);
				console.log("✅ Edited and saved");
				return "continue";

			case "r":
			case "reject":
				this.decisions.rejected.push(item);
				console.log("❌ Rejected - will be retranslated");
				return "continue";

			case "s":
			case "skip":
				this.decisions.skipped.push(item);
				console.log("⏭️  Skipped");
				return "continue";

			case "n":
			case "next":
				return "continue";

			case "q":
			case "quit":
				console.log("\n👋 Exiting review session...");
				return "quit";

			case "?":
			case "help":
				this.showHelp();
				return this.handleAction(await this.getUserInput("\nYour choice: "), item);

			default:
				console.log("❌ Invalid action. Try again.");
				return this.handleAction(await this.getUserInput("\nYour choice: "), item);
		}
	}

	/**
	 * Edit translation interactively
	 */
	async editTranslation(item) {
		console.log(`\nCurrent: "${item.translation}"`);
		const newTranslation = await this.getUserInput("New translation: ");

		if (newTranslation.trim() === "") {
			console.log("⚠️  Empty translation, keeping original");
			return item;
		}

		// Recalculate confidence for edited translation
		const newConfidence = ConfidenceScorer.calculateConfidence({
			aiConfidence: 1.0, // Manual edit gets high confidence
			sourceText: item.source,
			translation: newTranslation,
			sourceLang: item.sourceLang || this.config.source,
			targetLang: item.language,
			provider: "manual",
			category: item.category,
		});

		return {
			...item,
			translation: newTranslation,
			confidence: newConfidence,
			edited: true,
			editedAt: new Date().toISOString(),
		};
	}

	/**
	 * Show help information
	 */
	showHelp() {
		console.log("\n━━━ Help ━━━");
		console.log("A (Accept):  Approve translation as-is");
		console.log("E (Edit):    Modify the translation manually");
		console.log("R (Reject):  Mark for retranslation");
		console.log("S (Skip):    Skip for now, review later");
		console.log("N (Next):    Skip to next item");
		console.log("Q (Quit):    Exit review session");
		console.log("? (Help):    Show this help message");
		console.log("━".repeat(70));
	}

	/**
	 * Show review summary
	 */
	showSummary() {
		console.log("\n━".repeat(70));
		console.log("📊 Review Summary");
		console.log("━".repeat(70));
		console.log(`✅ Accepted:  ${this.decisions.accepted.length}`);
		console.log(`✏️  Edited:    ${this.decisions.edited.length}`);
		console.log(`❌ Rejected:  ${this.decisions.rejected.length}`);
		console.log(`⏭️  Skipped:   ${this.decisions.skipped.length}`);
		console.log(
			`📝 Total:     ${this.decisions.accepted.length + this.decisions.edited.length + this.decisions.rejected.length + this.decisions.skipped.length}/${this.reviewQueue.length}`
		);
		console.log("━".repeat(70));
	}

	/**
	 * Save review decisions
	 */
	saveDecisions() {
		const cacheDir = path.join(process.cwd(), ".localize-cache");
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}

		const decisionsFile = path.join(cacheDir, "review-decisions.json");

		const data = {
			timestamp: new Date().toISOString(),
			decisions: this.decisions,
			stats: {
				accepted: this.decisions.accepted.length,
				edited: this.decisions.edited.length,
				rejected: this.decisions.rejected.length,
				skipped: this.decisions.skipped.length,
			},
		};

		fs.writeFileSync(decisionsFile, JSON.stringify(data, null, 2));
		console.log(`\n💾 Decisions saved to: ${decisionsFile}`);

		// Apply accepted and edited translations
		this.applyDecisions();
	}

	/**
	 * Apply accepted and edited translations to locale files
	 */
	applyDecisions() {
		const toApply = [...this.decisions.accepted, ...this.decisions.edited];

		if (toApply.length === 0) {
			console.log("   No changes to apply");
			return;
		}

		console.log(`\n📝 Applying ${toApply.length} approved translations...`);

		const byLanguage = {};
		toApply.forEach((item) => {
			if (!byLanguage[item.language]) {
				byLanguage[item.language] = [];
			}
			byLanguage[item.language].push(item);
		});

		Object.entries(byLanguage).forEach(([lang, items]) => {
			const localeFile = path.join(this.config.localesDir, `${lang}.json`);

			let localeData = {};
			if (fs.existsSync(localeFile)) {
				localeData = JSON.parse(fs.readFileSync(localeFile, "utf8"));
			}

			items.forEach((item) => {
				this.setNestedValue(localeData, item.key, item.translation);
			});

			fs.writeFileSync(localeFile, JSON.stringify(localeData, null, 2) + "\n");
			console.log(`   ✅ Updated ${lang}.json (${items.length} translations)`);
		});

		console.log("\n✅ All approved translations applied!");
	}

	/**
	 * Set nested value in object using dot notation
	 */
	setNestedValue(obj, path, value) {
		const keys = path.split(".");
		let current = obj;

		for (let i = 0; i < keys.length - 1; i++) {
			if (!current[keys[i]]) {
				current[keys[i]] = {};
			}
			current = current[keys[i]];
		}

		current[keys[keys.length - 1]] = value;
	}

	/**
	 * Get user input from terminal
	 */
	getUserInput(prompt) {
		return new Promise((resolve) => {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			rl.question(prompt, (answer) => {
				rl.close();
				resolve(answer.trim());
			});
		});
	}

	/**
	 * Export review queue to JSON
	 */
	exportReviewQueue(format = "json") {
		if (this.reviewQueue.length === 0 && !this.loadReviewQueue()) {
			return;
		}

		const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
		const filename = `review-queue-${timestamp}.${format}`;

		if (format === "json") {
			fs.writeFileSync(filename, JSON.stringify(this.reviewQueue, null, 2));
			console.log(`\n📄 Review queue exported to: ${filename}`);
		} else if (format === "csv") {
			const csv = this.convertToCSV(this.reviewQueue);
			fs.writeFileSync(filename, csv);
			console.log(`\n📄 Review queue exported to: ${filename}`);
		}
	}

	/**
	 * Convert review queue to CSV format
	 */
	convertToCSV(items) {
		const headers = [
			"Key",
			"Language",
			"Source",
			"Translation",
			"Confidence",
			"Level",
			"Category",
			"Issues",
		];
		const rows = items.map((item) => [
			item.key,
			item.language,
			item.source,
			item.translation,
			item.confidence.score.toFixed(3),
			item.confidence.level,
			item.category || "general",
			item.confidence.issues.map((i) => i.message).join("; "),
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		return csvContent;
	}
}

export default ReviewCommand;
