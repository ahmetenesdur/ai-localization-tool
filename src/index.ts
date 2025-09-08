/**
 * AI Localization Tool - Main Entry Point
 *
 * This is the public API entry point for the AI Localization Tool.
 * It exports the main components that users might need to interact with programmatically.
 */

// Export core types
export type {
	LocalizationConfig,
	TranslationResult,
	ContextData,
	TranslationOptions,
	CommandOptions,
} from "./types";

// Export main orchestrator
export { Orchestrator } from "./core/orchestrator";

// Export provider factory
export { default as ProviderFactory } from "./core/provider-factory";

// Export utilities
export { default as StateManager } from "./utils/state-manager";
export { FileManager } from "./utils/file-manager";

// Export commands
export {
	translateFile,
	validateAndFixExistingTranslations,
	findLocaleFiles,
} from "./commands/translator";

// Export quality checkers
import QualityChecker from "./utils/quality";
import PlaceholderChecker from "./utils/quality/placeholder-checker";
import HtmlTagChecker from "./utils/quality/html-tag-checker";
import PunctuationChecker from "./utils/quality/punctuation-checker";
import LengthChecker from "./utils/quality/length-checker";
import TextSanitizer from "./utils/quality/text-sanitizer";

export {
	QualityChecker,
	PlaceholderChecker,
	HtmlTagChecker,
	PunctuationChecker,
	LengthChecker,
	TextSanitizer,
};
