class LengthChecker {
	constructor() {
		this.defaultConfig = {
			mode: "strict",
			maxDeviation: 0.1,
			minDeviation: -0.1,
		};
	}

	checkLength(source, translated, options = {}) {
		try {
			const sourceLength = this.calculateLength(source);
			const translatedLength = this.calculateLength(translated);
			const ratio = translatedLength / sourceLength;

			const config = this.getConfig(options);
			const { minRatio, maxRatio } = this.calculateAllowedRange(config);

			if (ratio < minRatio || ratio > maxRatio) {
				return [
					{
						type: "length",
						severity: this.determineSeverity(ratio, minRatio, maxRatio),
						message: this.generateErrorMessage(ratio, config),
						details: {
							mode: config.mode,
							context: config.context,
							targetLang: config.targetLang,
							sourceLength,
							translatedLength,
							ratio: parseFloat(ratio.toFixed(3)),
							allowedRange: {
								min: parseFloat(minRatio.toFixed(2)),
								max: parseFloat(maxRatio.toFixed(2)),
							},
							deviation: parseFloat((ratio - 1).toFixed(3)),
						},
					},
				];
			}

			return [];
		} catch (error) {
			console.error("Length check failed:", error);
			return [
				{
					type: "length",
					severity: "error",
					message: "Length validation failed due to technical error",
					details: { error: error.message },
				},
			];
		}
	}

	calculateLength(text) {
		if (!text) return 0;
		return text.replace(/\s+/g, "").length;
	}

	getConfig(options) {
		const lengthControl = options.lengthControl || {};
		const mode = lengthControl.mode || this.defaultConfig.mode;
		const targetLang = options.targetLang || "en";
		const context = options.detectedContext?.category || "general";

		if (mode === "smart") {
			return this.getSmartModeConfig(lengthControl, targetLang, context);
		}

		return this.getStandardModeConfig(lengthControl, mode, targetLang, context);
	}

	getSmartModeConfig(lengthControl, targetLang, context) {
		const smartRules = lengthControl.rules?.smart || {};
		const langRules = smartRules.byLanguage?.[targetLang] || {};
		const contextRules = smartRules.byContext?.[context] || {};
		const defaultValue = smartRules.default || 0.15;

		return {
			mode: "smart",
			targetLang,
			context,
			maxDeviation: Math.min(langRules.max ?? defaultValue, contextRules.max ?? defaultValue),
			minDeviation: Math.max(
				langRules.min ?? -defaultValue,
				contextRules.min ?? -defaultValue
			),
		};
	}

	getStandardModeConfig(lengthControl, mode, targetLang, context) {
		const deviation = lengthControl.rules?.[mode] || this.defaultConfig.maxDeviation;
		return {
			mode,
			targetLang,
			context,
			maxDeviation: deviation,
			minDeviation: -deviation,
		};
	}

	calculateAllowedRange(config) {
		return {
			minRatio: 1 + config.minDeviation,
			maxRatio: 1 + config.maxDeviation,
		};
	}

	determineSeverity(ratio, minRatio, maxRatio) {
		const deviation = Math.abs(ratio - 1);
		if (deviation > Math.max(Math.abs(minRatio - 1), Math.abs(maxRatio - 1)) * 1.5) {
			return "critical";
		}
		return "warning";
	}

	generateErrorMessage(ratio, config) {
		const percentage = Math.abs((ratio - 1) * 100).toFixed(1);
		const direction = ratio > 1 ? "longer" : "shorter";

		return (
			`Translation is ${percentage}% ${direction} than source text ` +
			`[${config.targetLang.toUpperCase()}, ${config.context}]`
		);
	}
}

export default LengthChecker;
