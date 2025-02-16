class QualityChecker {
	constructor(options = {}) {
		this.rules = {
			placeholderConsistency: true,
			htmlTagsConsistency: true,
			punctuationCheck: true,
			lengthValidation: true,
			autoFix: true,
			sanitizeOutput: true,
			...options,
		};
	}

	validate(sourceText, translatedText) {
		const issues = [];

		if (this.rules.placeholderConsistency) {
			const placeholderIssues = this.checkPlaceholders(
				sourceText,
				translatedText
			);
			issues.push(...placeholderIssues);
		}

		if (this.rules.htmlTagsConsistency) {
			const tagIssues = this.checkHtmlTags(sourceText, translatedText);
			issues.push(...tagIssues);
		}

		if (this.rules.punctuationCheck) {
			const punctuationIssues = this.checkPunctuation(
				sourceText,
				translatedText
			);
			issues.push(...punctuationIssues);
		}

		if (this.rules.lengthValidation) {
			const lengthIssues = this.checkLength(sourceText, translatedText);
			issues.push(...lengthIssues);
		}

		return {
			isValid: issues.length === 0,
			issues,
		};
	}

	validateAndFix(sourceText, translatedText) {
		let fixedText = translatedText;
		const issues = [];
		const fixes = [];

		if (this.rules.placeholderConsistency) {
			const { text, foundIssues, appliedFixes } = this.fixPlaceholders(
				sourceText,
				fixedText
			);
			fixedText = text;
			issues.push(...foundIssues);
			fixes.push(...appliedFixes);
		}

		if (this.rules.htmlTagsConsistency) {
			const { text, foundIssues, appliedFixes } = this.fixHtmlTags(
				sourceText,
				fixedText
			);
			fixedText = text;
			issues.push(...foundIssues);
			fixes.push(...appliedFixes);
		}

		if (this.rules.punctuationCheck) {
			const { text, foundIssues, appliedFixes } = this.fixPunctuation(
				sourceText,
				fixedText
			);
			fixedText = text;
			issues.push(...foundIssues);
			fixes.push(...appliedFixes);
		}

		return {
			originalText: translatedText,
			fixedText: fixedText,
			isModified: translatedText !== fixedText,
			issues,
			fixes,
		};
	}

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

	checkHtmlTags(source, translated) {
		const tagRegex = /<[^>]+>/g;
		const sourceTags = source.match(tagRegex) || [];
		const translatedTags = translated.match(tagRegex) || [];

		if (sourceTags.length !== translatedTags.length) {
			return [
				{
					type: "htmlTag",
					message: "HTML tag count mismatch",
					source: sourceTags,
					translated: translatedTags,
				},
			];
		}

		return [];
	}

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

	checkLength(source, translated, options = {}) {
		const sourceLengthWithoutSpaces = source.replace(/\s/g, "").length;
		const translatedLengthWithoutSpaces = translated.replace(
			/\s/g,
			""
		).length;
		const ratio = translatedLengthWithoutSpaces / sourceLengthWithoutSpaces;

		const lengthControl = options.lengthControl || { mode: "flexible" };
		const tolerance = lengthControl.tolerance || {
			flexible: 0.3,
			strict: 0.1,
			loose: 0.5,
		};

		let allowedDeviation;
		switch (lengthControl.mode) {
			case "exact":
				allowedDeviation = 0;
				break;
			case "strict":
				allowedDeviation = tolerance.strict;
				break;
			case "loose":
				allowedDeviation = tolerance.loose;
				break;
			case "flexible":
			default:
				allowedDeviation = tolerance.flexible;
		}

		const minRatio = 1 - allowedDeviation;
		const maxRatio = 1 + allowedDeviation;

		if (ratio < minRatio || ratio > maxRatio) {
			return [
				{
					type: "length",
					message: "Translation length is outside allowed range",
					details: {
						mode: lengthControl.mode,
						sourceLength: sourceLengthWithoutSpaces,
						translatedLength: translatedLengthWithoutSpaces,
						ratio,
						allowedRange: `${minRatio.toFixed(2)} - ${maxRatio.toFixed(2)}`,
					},
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
					fixedText =
						fixedText.slice(0, possiblePosition) +
						placeholder +
						fixedText.slice(possiblePosition);

					appliedFixes.push({
						type: "placeholder",
						message: `Added placeholder: ${placeholder}`,
					});
				}
			}
		});

		return { text: fixedText, foundIssues, appliedFixes };
	}

	fixHtmlTags(source, translated) {
		const tagRegex = /<[^>]+>/g;
		const sourceTags = source.match(tagRegex) || [];
		let fixedText = translated;
		const foundIssues = [];
		const appliedFixes = [];

		sourceTags.forEach((tag) => {
			if (!fixedText.includes(tag)) {
				foundIssues.push({
					type: "htmlTag",
					message: `Missing HTML tag: ${tag}`,
				});

				const isClosingTag = tag.startsWith("</");
				if (isClosingTag) {
					const openingTag = tag.replace("/", "");
					const position =
						fixedText.indexOf(openingTag) + openingTag.length;
					fixedText =
						fixedText.slice(0, position) +
						tag +
						fixedText.slice(position);
				} else {
					fixedText = tag + fixedText;
				}

				appliedFixes.push({
					type: "htmlTag",
					message: `Added HTML tag: ${tag}`,
				});
			}
		});

		return { text: fixedText, foundIssues, appliedFixes };
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

			fixedText = fixedText + sourceEndsWithPunctuation[0];

			appliedFixes.push({
				type: "punctuation",
				message: `Added punctuation mark: ${sourceEndsWithPunctuation[0]}`,
			});
		}

		return { text: fixedText, foundIssues, appliedFixes };
	}

	findBestPlaceholderPosition(translated, source, placeholder) {
		const sourcePosition = source.indexOf(placeholder);
		const sourceWords = source.slice(0, sourcePosition).split(" ").length;

		const translatedWords = translated.split(" ");
		if (sourceWords >= translatedWords.length) {
			return translated.length;
		}

		return translatedWords.slice(0, sourceWords).join(" ").length;
	}

	sanitizeTranslation(text) {
		return text
			.replace(/<think>[\s\S]*?<\/think>/g, "")
			.replace(/\*\*.*?:\*\*/g, "")
			.replace(/^['"]|['"]$/g, "")
			.replace(/^\s*[-•]\s*/g, "")
			.replace(/\n+/g, " ")
			.trim();
	}
}

module.exports = QualityChecker;
