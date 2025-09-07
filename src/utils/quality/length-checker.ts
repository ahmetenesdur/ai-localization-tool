interface LengthControlRules {
	strict?: number;
	flexible?: number;
	exact?: number;
	relaxed?: number;
	smart?: {
		default?: number;
		byLanguage?: Record<string, { max?: number; min?: number }>;
		byContext?: Record<string, { max?: number; min?: number }>;
	};
}

interface LengthControlConfig {
	mode?: string;
	rules?: LengthControlRules;
}

interface TranslationOptions {
	lengthControl?: LengthControlConfig;
	targetLang?: string;
	detectedContext?: {
		category?: string;
	};
	[key: string]: any;
}

interface LengthConfig {
	mode: string;
	targetLang: string;
	context: string;
	maxDeviation: number;
	minDeviation: number;
}

interface AllowedRange {
	minRatio: number;
	maxRatio: number;
}

interface LengthIssue {
	type: string;
	severity: string;
	message: string;
	details: {
		mode: string;
		context: string;
		targetLang: string;
		sourceLength: number;
		translatedLength: number;
		ratio: number;
		allowedRange: {
			min: number;
			max: number;
		};
		deviation: number;
		error?: string;
	};
}

class LengthChecker {
	private defaultConfig: {
		mode: string;
		maxDeviation: number;
		minDeviation: number;
	};

	constructor() {
		this.defaultConfig = {
			mode: "strict",
			maxDeviation: 0.1,
			minDeviation: -0.1,
		};
	}

	checkLength(
		source: string,
		translated: string,
		options: TranslationOptions = {}
	): LengthIssue[] {
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
		} catch (error: any) {
			console.error("Length check failed:", error);
			return [
				{
					type: "length",
					severity: "error",
					message: "Length validation failed due to technical error",
					details: {
						mode: "unknown",
						context: "unknown",
						targetLang: "unknown",
						sourceLength: 0,
						translatedLength: 0,
						ratio: 0,
						allowedRange: {
							min: 0,
							max: 0,
						},
						deviation: 0,
						error: error.message,
					},
				},
			];
		}
	}

	private calculateLength(text: string): number {
		if (!text) return 0;
		return text.replace(/\s+/g, "").length;
	}

	private getConfig(options: TranslationOptions): LengthConfig {
		const lengthControl = options.lengthControl || {};
		const mode = lengthControl.mode || this.defaultConfig.mode;
		const targetLang = options.targetLang || "en";
		const context = options.detectedContext?.category || "general";

		if (mode === "smart") {
			return this.getSmartModeConfig(lengthControl, targetLang, context);
		}

		return this.getStandardModeConfig(lengthControl, mode, targetLang, context);
	}

	private getSmartModeConfig(
		lengthControl: LengthControlConfig,
		targetLang: string,
		context: string
	): LengthConfig {
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

	private getStandardModeConfig(
		lengthControl: LengthControlConfig,
		mode: string,
		targetLang: string,
		context: string
	): LengthConfig {
		const deviation =
			lengthControl.rules?.[mode as keyof LengthControlRules] ||
			this.defaultConfig.maxDeviation;
		return {
			mode,
			targetLang,
			context,
			maxDeviation:
				typeof deviation === "number" ? deviation : this.defaultConfig.maxDeviation,
			minDeviation: -(typeof deviation === "number"
				? deviation
				: this.defaultConfig.maxDeviation),
		};
	}

	private calculateAllowedRange(config: LengthConfig): AllowedRange {
		return {
			minRatio: 1 + config.minDeviation,
			maxRatio: 1 + config.maxDeviation,
		};
	}

	private determineSeverity(ratio: number, minRatio: number, maxRatio: number): string {
		const deviation = Math.abs(ratio - 1);
		if (deviation > Math.max(Math.abs(minRatio - 1), Math.abs(maxRatio - 1)) * 1.5) {
			return "critical";
		}
		return "warning";
	}

	private generateErrorMessage(ratio: number, config: LengthConfig): string {
		const percentage = Math.abs((ratio - 1) * 100).toFixed(1);
		const direction = ratio > 1 ? "longer" : "shorter";

		return (
			`Translation is ${percentage}% ${direction} than source text ` +
			`[${config.targetLang.toUpperCase()}, ${config.context}]`
		);
	}
}

export default LengthChecker;
export type {
	LengthChecker,
	LengthControlConfig,
	TranslationOptions,
	LengthConfig,
	AllowedRange,
	LengthIssue,
};
