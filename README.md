# Localization Tool

Advanced AI-powered translation CLI tool for Next.js projects. Offers multi-language support, quality controls, and integration with 6 different AI providers.

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
	localesDir: "./locales", // Location of translation files
	source: "en", // Source language
	targets: ["tr", "es", "de"], // Target languages

	// API Provider Settings
	apiProvider: "qwen", // Preferred provider
	useFallback: true, // Fallback provider system

	// Quality Control Settings
	qualityChecks: true, // Quality control system

	// Context Settings
	context: {
		enabled: true,
		categories: {
			technical: ["blockchain", "API", "smart contract"],
			business: ["revenue", "marketing", "strategy"],
		},
		detectionThreshold: 2, // Minimum match count
	},

	// Style Settings
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // friendly, professional, technical
	},

	// Length Control
	lengthControl: {
		mode: "flexible", // strict, flexible, exact, loose
	},
};
```

### API Keys

Add your API keys to the `.env` file:

```env
QWEN_API_KEY=sk-xxxx
OPENAI_API_KEY=sk-yyyy
DEEPSEEK_API_KEY=sk-zzzz
AZURE_DEEPSEEK_API_KEY=sk-aaaa
GEMINI_API_KEY=sk-bbbb
```

### Advanced Configuration Options

Custom settings for each API provider:

```javascript
module.exports = {
	// ... other settings
	apiConfig: {
		qwen: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
		},
	},
};
```

## 🚀 Usage

```bash
localize --source en --targets tr,es --localesDir ./src/locales
```

**Basic Commands:**

- `--apiProvider`: Qwen, OpenAI, Gemini, DeepSeek, AzureDeepSeek
- `--lengthControl`: strict/flexible/exact/loose
- `--useFallback`: true/false

## 🌟 Features

### Multi-Provider Support

| Provider       | Model Options       | Requests Per Minute |
| -------------- | ------------------- | ------------------- |
| Qwen           | qwen-plus           | 50                  |
| OpenAI         | gpt-4o, gpt-4-turbo | 60                  |
| Gemini         | gemini-1.5-flash    | 100                 |
| DeepSeek       | deepseek-chat       | 45                  |
| Azure DeepSeek | DeepSeek-R1         | 80                  |

### Smart Features

- 🔍 Contextual Translation (Automatic category detection with keyword matching)
- 🛡️ Quality Controls:
    ```javascript
    {
    	placeholderConsistency: true,  // {variable} validation
    	htmlTagsConsistency: true,     // <b>tag</b> validation
    	punctuationCheck: true,        // Punctuation check
    	lengthValidation: true         // Text length optimization
    }
    ```
- 📈 Real-time Progress Tracking:
    ```
    Progress: 72% | 360/500 | 45.3s
    ```

## 🗃️ Cache Management

Translations are automatically stored in `.translation-cache/cache.json` file:

```json
{
	"md5hash": {
		"translation": "Hello World",
		"timestamp": "2024-03-15T14:22:35.123Z"
	}
}
```

## 🔧 Advanced Settings

Add API keys to your `.env` file:

```env
QWEN_API_KEY=sk-xxxx
OPENAI_API_KEY=sk-yyyy
DEEPSEEK_API_KEY=sk-zzzz
AZURE_DEEPSEEK_API_KEY=sk-zzzz
GEMINI_API_KEY=sk-zzzz
```

## 🛠️ Error Management

**Fallback Mechanism:**

1. Primary provider (Qwen)
2. OpenAI
3. Gemini
4. DeepSeek
5. Azure DeepSeek

Error example:

```bash
[ERROR] Translation failed - Switching to fallback provider... (3 providers remaining)
```

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
