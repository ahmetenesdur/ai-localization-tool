class TextSanitizer {
	sanitize(text) {
		return this.applyRules(text, [
			this.removeThinkTags,
			this.removeMarkdownFormatting,
			this.removeQuotes,
			this.removeBulletPoints,
			this.normalizeWhitespace,
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

	normalizeWhitespace(text) {
		return text.replace(/\n+/g, " ").trim();
	}
}

module.exports = TextSanitizer;
