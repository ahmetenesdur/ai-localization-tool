class TextSanitizer {
	sanitize(text) {
		if (!text) return text;

		const rules = [
			this.removeThinkTags,
			this.removeMarkdownFormatting,
			this.removeQuotes,
			this.removeBulletPoints,
			this.removeExplanations,
			this.removeAIArtifacts,
			this.removeAllArtifacts,
			this.normalizeWhitespace,
			this.trimSpecialChars,
		];

		return this.applyRules(text, rules);
	}

	applyRules(text, rules) {
		return rules.reduce((processedText, rule) => rule(processedText), text);
	}

	removeThinkTags(text) {
		// More robust think tag removal
		return text
			.replace(/<think>[\s\S]*?<\/think>/gi, "")
			.replace(/<think[\s\S]*?<\/think>/gi, "")
			.trim();
	}

	removeMarkdownFormatting(text) {
		return text.replace(/\*\*.*?:\*\*/g, "");
	}

	removeQuotes(text) {
		return text.replace(/^['"]|['"]$/g, "");
	}

	removeBulletPoints(text) {
		return text.replace(/^\s*[-•]\s*/g, "");
	}

	removeExplanations(text) {
		// Remove any text between common explanation markers
		return text
			.replace(/<think>[\s\S]*?<\/think>/g, "")
			.replace(/\[.*?\]/g, "")
			.replace(/\(.*?\)/g, "")
			.replace(/^(Translation:|Translated text:|Result:|Output:)/gi, "");
	}

	removeAIArtifacts(text) {
		// Remove common AI model output patterns
		return text
			.replace(
				/^(Here's the translation:|The translation is:|I would translate this as:)/gi,
				""
			)
			.replace(/^[A-Za-z]+ translation: /g, "")
			.replace(/\b(Note|Remember|Important):.+$/gi, "");
	}

	trimSpecialChars(text) {
		// Remove special characters and extra whitespace
		return text.replace(/^['"*_~`]+|['"*_~`]+$/g, "").replace(/^\s+|\s+$/g, "");
	}

	normalizeWhitespace(text) {
		// Remove duplicate lines and normalize whitespace
		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line); // Remove empty lines

		// Remove duplicate consecutive lines
		const uniqueLines = lines.filter((line, index, arr) => line !== arr[index - 1]);

		return uniqueLines.join("\n");
	}

	removeAllArtifacts(text) {
		const cleaned = text
			.replace(/<think>[\s\S]*?<\/think>/gi, "")
			.replace(/^[A-Za-z]+ translation:[\s\S]*?\n/gim, "")
			.replace(/^(Here's|This is|The) (the )?translation:?\s*/gim, "")
			.replace(/^Translation result:?\s*/gim, "")
			.replace(/^\s*[-•]\s*/gm, "")
			.replace(/^['"]|['"]$/g, "")
			.replace(/^\s+|\s+$/gm, "");

		// Remove duplicate lines
		const lines = cleaned
			.split("\n")
			.filter((line) => line.trim())
			.filter((line, index, arr) => line !== arr[index - 1]);

		return lines.join("\n");
	}
}

module.exports = TextSanitizer;
