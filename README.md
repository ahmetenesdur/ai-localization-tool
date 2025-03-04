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
	targets: ["tr", "de", "es"], // Expanded target languages

	// API Provider Settings
	apiProvider: "dashscope", // Primary provider
	useFallback: true, // Enable fallback system

	// API Configuration
	apiConfig: {
		dashscope: {
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
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Preserve technical terms and variable names",
				weight: 1.3,
			},
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
			sanitizeOutput: true,
		},
	},

	// Style Settings
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // friendly, professional, technical
	},

	// Length Control
	lengthControl: {
		mode: "smart",
		rules: {
			strict: 0.1, // 10% deviation
			flexible: 0.3, // 30% deviation
			exact: 0.05, // 5% deviation (near exact)
			relaxed: 0.5, // 50% deviation
			smart: {
				default: 0.15,
				byLanguage: {
					ja: { max: 0.35, min: -0.2 },
					zh: { max: 0.35, min: -0.2 },
					th: { max: 0.3, min: -0.15 },
					vi: { max: 0.25, min: -0.15 },
					hi: { max: 0.2, min: -0.1 },
					ru: { max: 0.25, min: -0.15 },
					uk: { max: 0.25, min: -0.15 },
					pl: { max: 0.2, min: -0.1 },
					de: { max: 0.15, min: -0.1 },
					fr: { max: 0.15, min: -0.1 },
					es: { max: 0.15, min: -0.1 },
					tr: { max: 0.15, min: -0.1 },
				},
				byContext: {
					technical: { max: 0.2, min: -0.1 },
					marketing: { max: 0.3, min: -0.15 },
					legal: { max: 0.1, min: -0.05 },
					general: { max: 0.15, min: -0.1 },
				},
			},
		},
	},
};
```

### Required API Keys

Add your API keys to the `.env` file:

```env
DASHSCOPE_API_KEY=sk-xxxx
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
localize --source en --targets tr --apiProvider dashscope --contextThreshold 3 --contextConfidence 0.7

# Debug mode for context analysis
localize --source en --targets es --contextDebug

# Fix length issues in existing translations
localize --source en --targets tr,es --fix-length

# Strict length control for new translations
localize --source en --targets tr,es --lengthControl strict
```

### CLI Options

| Option              | Description                      | Default   | Values                                                  |
| ------------------- | -------------------------------- | --------- | ------------------------------------------------------- |
| --source            | Source language                  | en        | Any ISO language code                                   |
| --targets           | Target languages                 | []        | Comma-separated ISO codes                               |
| --localesDir        | Locales directory                | ./locales | Path to JSON files                                      |
| --apiProvider       | AI provider                      | dashscope | dashscope, xai, openai, gemini, deepseek, azuredeepseek |
| --contextThreshold  | Keyword matches                  | 2         | 1-5                                                     |
| --contextConfidence | Confidence score                 | 0.6       | 0-1                                                     |
| --contextDebug      | Debug mode                       | false     | boolean                                                 |
| --lengthControl     | Length validation                | smart     | strict, flexible, exact, relaxed, smart                 |
| --fix-length        | Fix existing translation lengths | false     | boolean                                                 |

## 🌟 Features

### Provider Integration

| Provider       | Base Model       | RPM Limit | Fallback Order |
| -------------- | ---------------- | --------- | -------------- |
| Dashscope      | qwen-plus        | 50        | 1              |
| XAI            | grok-2-1212      | 60        | 2              |
| OpenAI         | gpt-4o           | 60        | 3              |
| Azure DeepSeek | DeepSeek-R1      | 80        | 4              |
| DeepSeek       | deepseek-chat    | 45        | 5              |
| Gemini         | gemini-1.5-flash | 100       | 6              |

### Context Detection System

-   Weighted category matching
-   Confidence-based selection
-   Automatic fallback handling
-   Debug mode for analysis
-   Category-specific prompts

### Quality Control

-   Placeholder validation
-   HTML tag preservation
-   Punctuation checking
-   Length control
-   Output sanitization

### Length Control Modes

| Mode     | Tolerance | Description                                     |
| -------- | --------- | ----------------------------------------------- |
| strict   | 0.1       | Max 10% longer than source                      |
| flexible | 0.3       | Max 30% longer than source                      |
| exact    | 0.05      | Near exact length match (±5%)                   |
| relaxed  | 0.5       | Max 50% longer for special cases                |
| smart    | -         | Combines language and context rules dynamically |

**Smart Mode Features:**

-   Language-specific length rules (e.g. Japanese: 35% max)
-   Context-aware adjustments (technical: 20% vs marketing: 30%)
-   Automatic brevity optimization
-   Priority to semantic accuracy over strict length

### Error Handling

-   Provider-specific error messages
-   Automatic fallback system
-   Progress preservation
-   Rate limiting
-   Queue management

### Real-time Progress

```plaintext
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
