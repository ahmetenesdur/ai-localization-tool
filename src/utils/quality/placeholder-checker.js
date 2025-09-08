class PlaceholderChecker {
	checkPlaceholders(source, translated) {
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

	fixPlaceholders(source, translated) {
		const placeholderRegex = /\{[^}]+\}|\$\{[^}]+\}|%[sd]/g;
		const sourcePlaceholders = source.match(placeholderRegex) || [];
		let fixedText = translated;
		const foundIssues = [];
		const appliedFixes = [];

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

	findBestPlaceholderPosition(translated, source, placeholder) {
		const sourcePosition = source.indexOf(placeholder);
		const sourceWords = source.slice(0, sourcePosition).split(" ").length;
		const translatedWords = translated.split(" ");

		return sourceWords >= translatedWords.length
			? translated.length
			: translatedWords.slice(0, sourceWords).join(" ").length;
	}

	insertPlaceholder(text, placeholder, position) {
		return text.slice(0, position) + placeholder + text.slice(position);
	}
}

module.exports = PlaceholderChecker;
