// localize.config.js
module.exports = {
	// General Settings
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language
	targets: ["tr", "de"], // Target languages
	context: "Web Application", // Default context

	// Advanced Settings
	translationMemory: true, // Use translation memory
	qualityChecks: true, // Enable quality checks
	contextDetection: true, // Automatic context detection

	// Style Guide Settings
	styleGuide: {
		lengthControl: "Flexible", // Text length control
		inclusiveLanguage: true, // Use inclusive language
		formality: "Professional", // Formality level
		toneOfVoice: "Professional", // Tone of voice for translations
	},

	// Brand Settings
	brandName: "YourAppName", // Brand name
	brandVoice: "Professional, Trustworthy", // Brand voice
	emotiveIntent: "Confident", // Emotional tone

	// Domain Expertise and Idioms
	domainExpertise: "Technology", // Domain context
	idioms: true, // Handle idiomatic expressions

	// API Provider Settings
	apiProvider: "openai", // Preferred provider

	// Provider-specific configuration
	apiConfig: {
		openai: {
			model: "gpt-4-turbo-preview",
			temperature: 0.3,
			maxTokens: 2000,
		},
		deepseek: {
			model: "deepseek-chat-r1",
			temperature: 0.2,
		},
		gemini: {
			model: "gemini-pro",
			temperature: 0.3,
		},
	},
};
