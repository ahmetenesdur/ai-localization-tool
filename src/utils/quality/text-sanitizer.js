class TextSanitizer {
	sanitize(text) {
		return this.applyRules(text, [
			this.removeThinkTags,
			this.removeMarkdownFormatting,
			this.removeQuotes,
			this.removeBulletPoints,
			this.removeExplanations,
			this.removeAIArtifacts,
			this.normalizeWhitespace,
			this.trimSpecialChars,
		]);
	}

	applyRules(text, rules) {
		return rules.reduce((processedText, rule) => rule(processedText), text);
	}

	removeThinkTags(text) {
		return text.replace(/<think>[\s\S]*?<\/think>/g, "");
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
		return text
			.replace(/^['"*_~`]+|['"*_~`]+$/g, "")
			.replace(/^\s+|\s+$/g, "");
	}

	normalizeWhitespace(text) {
		return text.replace(/\n+/g, " ").trim();
	}
}

module.exports = TextSanitizer;
