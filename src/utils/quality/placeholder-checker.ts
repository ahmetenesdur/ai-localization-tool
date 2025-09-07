interface PlaceholderIssue {
	type: string;
	message: string;
	source?: string[];
	translated?: string[];
}

interface PlaceholderFixResult {
	text: string;
	foundIssues: PlaceholderIssue[];
	appliedFixes: PlaceholderIssue[];
}

class PlaceholderChecker {
	checkPlaceholders(source: string, translated: string): PlaceholderIssue[] {
		const placeholderRegex = /\{[^}]+\}|\$\{[^}]+\}|%[sd]/g;
		const sourcePlaceholders = source.match(placeholderRegex) || [];
		const translatedPlaceholders = translated.match(placeholderRegex) || [];

		if (sourcePlaceholders.length !== translatedPlaceholders.length) {
			return [
				{
					type: "placeholder",
					message: "Placeholder count mismatch",
					source: sourcePlaceholders,
					translated: translatedPlaceholders,
				},
			];
		}
		return [];
	}

	fixPlaceholders(source: string, translated: string): PlaceholderFixResult {
		const placeholderRegex = /\{[^}]+\}|\$\{[^}]+\}|%[sd]/g;
		const sourcePlaceholders = source.match(placeholderRegex) || [];
		let fixedText = translated;
		const foundIssues: PlaceholderIssue[] = [];
		const appliedFixes: PlaceholderIssue[] = [];

		sourcePlaceholders.forEach((placeholder) => {
			if (!fixedText.includes(placeholder)) {
				foundIssues.push({
					type: "placeholder",
					message: `Missing placeholder: ${placeholder}`,
				});

				const possiblePosition = this.findBestPlaceholderPosition(
					fixedText,
					source,
					placeholder
				);

				if (possiblePosition !== -1) {
					fixedText = this.insertPlaceholder(fixedText, placeholder, possiblePosition);
					appliedFixes.push({
						type: "placeholder",
						message: `Added placeholder: ${placeholder}`,
					});
				}
			}
		});

		return { text: fixedText, foundIssues, appliedFixes };
	}

	private findBestPlaceholderPosition(
		translated: string,
		source: string,
		placeholder: string
	): number {
		const sourcePosition = source.indexOf(placeholder);
		const sourceWords = source.slice(0, sourcePosition).split(" ").length;
		const translatedWords = translated.split(" ");

		return sourceWords >= translatedWords.length
			? translated.length
			: translatedWords.slice(0, sourceWords).join(" ").length;
	}

	private insertPlaceholder(text: string, placeholder: string, position: number): string {
		return text.slice(0, position) + placeholder + text.slice(position);
	}
}

export default PlaceholderChecker;
export type { PlaceholderChecker, PlaceholderIssue, PlaceholderFixResult };
