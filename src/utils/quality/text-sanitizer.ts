type SanitizationRule = (text: string) => string;

class TextSanitizer {
	sanitize(text: string): string {
		if (!text) return text;

		const rules: SanitizationRule[] = [
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

	private applyRules(text: string, rules: SanitizationRule[]): string {
		return rules.reduce((processedText, rule) => rule(processedText), text);
	}

	removeThinkTags(text: string): string {
		// More robust think tag removal
		return text
			.replace(/```[\s\S]*?<\/think>/gi, "")
			.replace(/<think[\s\S]*?<\/think>/gi, "")
			.trim();
	}

	private removeMarkdownFormatting(text: string): string {
		return text.replace(/\*\*.*?:\*\*/g, "");
	}

	private removeQuotes(text: string): string {
		return text.replace(/^['"]|['"]$/g, "");
	}

	private removeBulletPoints(text: string): string {
		return text.replace(/^\s*[-•]\s*/g, "");
	}

	private removeExplanations(text: string): string {
		// Remove any text between common explanation markers
		return text
			.replace(/```[\s\S]*?<\/think>/g, "")
			.replace(/\[.*?\]/g, "")
			.replace(/\(.*?\)/g, "")
			.replace(/^(Translation:|Translated text:|Result:|Output:)/gi, "");
	}

	private removeAIArtifacts(text: string): string {
		// Remove common AI model output patterns
		return text
			.replace(
				/^(Here's the translation:|The translation is:|I would translate this as:)/gi,
				""
			)
			.replace(/^[A-Za-z]+ translation: /g, "")
			.replace(/\b(Note|Remember|Important):.+$/gi, "");
	}

	private trimSpecialChars(text: string): string {
		// Remove special characters and extra whitespace
		return text.replace(/^['"*_~`]+|['"*_~`]+$/g, "").replace(/^\s+|\s+$/g, "");
	}

	private normalizeWhitespace(text: string): string {
		// Remove duplicate lines and normalize whitespace
		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line); // Remove empty lines

		// Remove duplicate consecutive lines
		const uniqueLines = lines.filter((line, index, arr) => line !== arr[index - 1]);

		return uniqueLines.join("\n");
	}

	removeAllArtifacts(text: string): string {
		const cleaned = text
			.replace(/```[\s\S]*?<\/think>/gi, "")
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

export default TextSanitizer;
