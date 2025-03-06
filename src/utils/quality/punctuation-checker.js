class PunctuationChecker {
	checkPunctuation(source, translated) {
		const issues = [];
		const endPunctuation = /[.!?]$/;

		if (source.match(endPunctuation) && !translated.match(endPunctuation)) {
			issues.push({
				type: "punctuation",
				message: "Missing punctuation mark",
			});
		}

		return issues;
	}

	fixPunctuation(source, translated) {
		const endPunctuation = /[.!?]$/;
		let fixedText = translated;
		const foundIssues = [];
		const appliedFixes = [];

		const sourceEndsWithPunctuation = source.match(endPunctuation);
		const translatedEndsWithPunctuation = translated.match(endPunctuation);

		if (sourceEndsWithPunctuation && !translatedEndsWithPunctuation) {
			foundIssues.push({
				type: "punctuation",
				message: "Missing punctuation mark",
			});

			fixedText = this.addPunctuation(fixedText, sourceEndsWithPunctuation[0]);
			appliedFixes.push({
				type: "punctuation",
				message: `Added punctuation mark: ${sourceEndsWithPunctuation[0]}`,
			});
		}

		return { text: fixedText, foundIssues, appliedFixes };
	}

	addPunctuation(text, punctuation) {
		return text.trim() + punctuation;
	}
}

module.exports = PunctuationChecker;
