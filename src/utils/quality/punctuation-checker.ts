interface PunctuationIssue {
	type: string;
	message: string;
}

interface PunctuationFixResult {
	text: string;
	foundIssues: PunctuationIssue[];
	appliedFixes: PunctuationIssue[];
}

class PunctuationChecker {
	checkPunctuation(source: string, translated: string): PunctuationIssue[] {
		const issues: PunctuationIssue[] = [];
		const endPunctuation = /[.!?]$/;

		if (source.match(endPunctuation) && !translated.match(endPunctuation)) {
			issues.push({
				type: "punctuation",
				message: "Missing punctuation mark",
			});
		}

		return issues;
	}

	fixPunctuation(source: string, translated: string): PunctuationFixResult {
		const endPunctuation = /[.!?]$/;
		let fixedText = translated;
		const foundIssues: PunctuationIssue[] = [];
		const appliedFixes: PunctuationIssue[] = [];

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

	private addPunctuation(text: string, punctuation: string): string {
		return text.trim() + punctuation;
	}
}

export default PunctuationChecker;
export type { PunctuationChecker, PunctuationIssue, PunctuationFixResult };
