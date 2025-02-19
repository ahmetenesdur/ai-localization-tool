# Localization Tool

Advanced AI-powered translation CLI tool for Next.js projects. Offers multi-language support, quality controls, and integration with different AI providers.

## 📦 Installation

```bash
# Global installation
npm install -g localization-tool

# or direct usage with npx
npx localization-tool
```

## ⚙️ Configuration

### Basic Configuration

Create `localize.config.js` file in your project root directory:

```javascript
module.exports = {
	// Basic Settings
	localesDir: "./locales", // Directory for translation files
	source: "en", // Source language
	targets: ["tr", "es"], // Target languages

	// API Provider Settings
	apiProvider: "qwen", // Primary provider
	useFallback: true, // Enable fallback system

	// API Configuration
	apiConfig: {
		qwen: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
		},
		xai: {
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
		},
		azureDeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
		},
	},

	// Translation Context
	context: {
		enabled: true,
		detection: {
			threshold: 2, // Minimum keyword matches
			minConfidence: 0.6, // Minimum confidence score
		},
		categories: {
			defi: {
				keywords: ["DeFi", "staking", "yield"],
				prompt: "Keep DeFi terms in English",
				weight: 1.2,
			},
		},
		fallback: {
			category: "general",
			prompt: "Provide a natural translation",
		},
	},

	// Quality Settings
	qualityChecks: {
		enabled: true,
		rules: {
			placeholderConsistency: true,
			htmlTagsConsistency: true,
			punctuationCheck: true,
			lengthValidation: true,
			styleGuideChecks: true,
		},
	},

	// Style Settings
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // friendly, professional, technical
	},

	// Length Control
	lengthControl: {
		mode: "strict", // strict, flexible, exact, loose
	},
};
```

### Required API Keys

Add your API keys to the `.env` file:

```env
QWEN_API_KEY=sk-xxxx
OPENAI_API_KEY=sk-yyyy
DEEPSEEK_API_KEY=sk-zzzz
AZURE_DEEPSEEK_API_KEY=sk-aaaa
GEMINI_API_KEY=sk-bbbb
XAI_API_KEY=sk-cccc
```

## 🚀 Usage

### Basic Command

```bash
localize --source en --targets tr,es --localesDir ./src/locales
```

### Advanced Usage

```bash
# With specific provider and context settings
localize --source en --targets tr --apiProvider qwen --contextThreshold 3 --contextConfidence 0.7

# Debug mode for context analysis
localize --source en --targets es --contextDebug

# Strict length control
localize --source en --targets tr,es --lengthControl strict
```

### CLI Options

| Option              | Description       | Default   | Values                                             |
| ------------------- | ----------------- | --------- | -------------------------------------------------- |
| --source            | Source language   | en        | Any ISO language code                              |
| --targets           | Target languages  | []        | Comma-separated ISO codes                          |
| --localesDir        | Locales directory | ./locales | Path to JSON files                                 |
| --apiProvider       | AI provider       | qwen      | qwen, xai, openai, gemini, deepseek, azuredeepseek |
| --contextThreshold  | Keyword matches   | 2         | 1-5                                                |
| --contextConfidence | Confidence score  | 0.6       | 0-1                                                |
| --contextDebug      | Debug mode        | false     | boolean                                            |
| --lengthControl     | Length validation | strict    | strict, flexible, exact, loose                     |

## 🌟 Features

### Provider Integration

Each provider is configured with specific models and settings:

```javascript
{
	placeholderConsistency: true,   // Validates {variables} and ${expressions}
	htmlTagsConsistency: true,      // Preserves HTML markup (<div>, <span>, etc.)
	punctuationCheck: true,         // Ensures proper end punctuation
	lengthValidation: true,         // Controls output length based on mode
	styleGuideChecks: true          // Enforces tone and formality
}
```

### Context Detection System

- Weighted category matching
- Confidence-based selection
- Automatic fallback handling
- Debug mode for analysis
- Category-specific prompts

### Quality Control

- Placeholder validation
- HTML tag preservation
- Punctuation checking
- Length control
- Style guide enforcement

### Length Control Modes

| Mode     | Tolerance | Description           |
| -------- | --------- | --------------------- |
| strict   | 0.1       | 10% deviation allowed |
| flexible | 0.3       | 30% deviation allowed |
| exact    | 0         | Exact length match    |
| loose    | 0.5       | 50% deviation allowed |

### Error Handling

- Provider-specific error messages
- Automatic fallback system
- Progress preservation
- Rate limiting
- Queue management

### Real-time Progress

```
🚀 tr [■■■■■■■■■■■■■■     ] 72%  ✅ 340  ❌ 5  ⏳ 45.3s

📊 Translation Summary for tr:
✅ Success: 340/500
❌ Failed: 5
⏳ Time: 45.3s

🌍 Global Translation Summary:
Languages Processed: 1
Total Translations: 340
✅ Success: 340
❌ Failed: 5
⏳ Total Time: 45.3s

📊 Context Analysis by Category:
technical: 156 items (85.5% avg confidence)
defi: 124 items (78.2% avg confidence)
general: 60 items
```

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
