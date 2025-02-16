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

	// Quality Settings
	qualityChecks: true, // Enable quality controls

	// Context Detection
	context: {
		enabled: true,
		mode: "auto", // auto, manual, hybrid
		categories: {
			defi: {
				keywords: ["DeFi", "liquidity pool", "yield farming"],
				prompt: "DeFi-specific translation context",
			},
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Technical documentation context",
			},
		},
		detection: {
			threshold: 2, // Minimum keyword matches
			minConfidence: 0.6, // Minimum confidence score
		},
	},

	// Style Configuration
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
GOOGLE_API_KEY=sk-bbbb        # For Gemini
```

## 🚀 Usage

### Basic Command

```bash
localize --source en --targets tr,es --localesDir ./src/locales
```

### Available Options

| Option          | Description       | Values                                        |
| --------------- | ----------------- | --------------------------------------------- |
| --source        | Source language   | Any ISO language code                         |
| --targets       | Target languages  | Comma-separated ISO codes                     |
| --localesDir    | Locales directory | Path to JSON files                            |
| --apiProvider   | AI provider       | qwen, openai, gemini, deepseek, azureDeepseek |
| --contextMode   | Context detection | auto, manual, hybrid                          |
| --lengthControl | Length validation | strict, flexible, exact, loose                |
| --useFallback   | Provider fallback | true/false                                    |

## 🌟 Features

### AI Provider Integration

| Provider       | Model            | RPM | Best For         |
| -------------- | ---------------- | --- | ---------------- |
| Qwen           | qwen-plus        | 50  | Default provider |
| OpenAI         | gpt-4o           | 60  | High accuracy    |
| Gemini         | gemini-1.5-flash | 100 | Fast processing  |
| DeepSeek       | deepseek-chat    | 45  | Cost-effective   |
| Azure DeepSeek | DeepSeek-R1      | 80  | Enterprise use   |

### Smart Features

#### Context Detection

- Automatic category detection based on keywords
- Confidence scoring system
- Category-specific translation prompts
- Fallback to general translation when no context matches

#### Quality Controls

```javascript
{
	placeholderConsistency: true,   // Validates {variables}
	htmlTagsConsistency: true,      // Preserves HTML markup
	punctuationCheck: true,         // Ensures proper punctuation
	lengthValidation: true          // Controls output length
}
```

#### Progress Tracking

```
Progress: 72% | 360/500 files | ⏱️ 45.3s
✅ Successful: 340
⚡ From Cache: 15
❌ Failed: 5
```

### Cache System

- **Location**: `.translation-cache/cache.json`
- **Format**:

```json
{
	"md5hash": {
		"translation": "Translated text",
		"timestamp": "2024-03-15T14:22:35.123Z"
	}
}
```

- **Features**:
    - Memory + Disk hybrid caching
    - 24-hour cache validity
    - Automatic cache cleanup

### Error Management

#### Fallback Provider System

1. Primary configured provider
2. Qwen (default fallback)
3. Gemini
4. DeepSeek
5. Azure DeepSeek
6. OpenAI

#### Error Handling

- Automatic provider switching on failure
- Detailed error logging
- Progress preservation
- Rate limiting per provider
- Request queue management

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
