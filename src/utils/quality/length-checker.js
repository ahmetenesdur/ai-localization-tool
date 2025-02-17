class LengthChecker {
	checkLength(source, translated, options = {}) {
		const sourceLengthWithoutSpaces =
			this.getTextLengthWithoutSpaces(source);
		const translatedLengthWithoutSpaces =
			this.getTextLengthWithoutSpaces(translated);
		const ratio = translatedLengthWithoutSpaces / sourceLengthWithoutSpaces;

		const { allowedDeviation, mode } =
			this.calculateAllowedDeviation(options);
		const { minRatio, maxRatio } =
			this.calculateRatioRange(allowedDeviation);

		if (ratio < minRatio || ratio > maxRatio) {
			return [
				{
					type: "length",
					message: "Translation length is outside allowed range",
					details: {
						mode,
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

	getTextLengthWithoutSpaces(text) {
		return text.replace(/\s/g, "").length;
	}

	calculateAllowedDeviation(options) {
		const lengthControl = options.lengthControl || { mode: "flexible" };
		const tolerance = {
			flexible: 0.3,
			strict: 0.1,
			loose: 0.5,
			exact: 0,
		};

		const mode = lengthControl.mode || "flexible";
		return {
			allowedDeviation: tolerance[mode] || tolerance.flexible,
			mode,
		};
	}

	calculateRatioRange(allowedDeviation) {
		return {
			minRatio: 1 - allowedDeviation,
			maxRatio: 1 + allowedDeviation,
		};
	}
}

module.exports = LengthChecker;
