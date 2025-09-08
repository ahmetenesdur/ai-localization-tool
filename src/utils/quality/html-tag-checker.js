class HtmlTagChecker {
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

				fixedText = this.insertHtmlTag(fixedText, tag);
				appliedFixes.push({
					type: "htmlTag",
					message: `Added HTML tag: ${tag}`,
				});
			}
		});

		return { text: fixedText, foundIssues, appliedFixes };
	}

	insertHtmlTag(text, tag) {
		const isClosingTag = tag.startsWith("</");
		if (isClosingTag) {
			const openingTag = tag.replace("/", "");
			const position = text.indexOf(openingTag) + openingTag.length;
			return text.slice(0, position) + tag + text.slice(position);
		}
		return tag + text;
	}
}

module.exports = HtmlTagChecker;
