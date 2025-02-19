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

	// Context Detection
	context: {
		enabled: true,
		detection: {
			threshold: 2, // Minimum keyword matches
			minConfidence: 0.6, // Minimum confidence score
		},
		categories: {
			defi: {
				keywords: ["DeFi", "liquidity pool", "yield farming"],
				prompt: "DeFi-specific translation context",
				weight: 1.2,
			},
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Technical documentation context",
				weight: 1.3,
			},
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

### Available Options

| Option              | Description       | Values                                             |
| ------------------- | ----------------- | -------------------------------------------------- |
| --source            | Source language   | Any ISO language code                              |
| --targets           | Target languages  | Comma-separated ISO codes                          |
| --localesDir        | Locales directory | Path to JSON files                                 |
| --apiProvider       | AI provider       | qwen, xai, openai, gemini, deepseek, azuredeepseek |
| --contextThreshold  | Keyword matches   | 1-5 (default: 2)                                   |
| --contextConfidence | Confidence score  | 0-1 (default: 0.6)                                 |
| --contextDebug      | Debug mode        | boolean                                            |
| --lengthControl     | Length validation | strict, flexible, exact, loose                     |

## 🌟 Features

### AI Provider Integration

| Provider       | Model            | RPM |
| -------------- | ---------------- | --- |
| Qwen           | qwen-plus        | 50  |
| XAI            | grok-2-1212      | 60  |
| OpenAI         | gpt-4o           | 60  |
| Gemini         | gemini-1.5-flash | 100 |
| DeepSeek       | deepseek-chat    | 45  |
| Azure DeepSeek | DeepSeek-R1      | 80  |

### Quality Control System

#### Automated Checks

```javascript
{
	placeholderConsistency: true,   // Validates {variables} and ${expressions}
	htmlTagsConsistency: true,      // Preserves HTML markup (<div>, <span>, etc.)
	punctuationCheck: true,         // Ensures proper end punctuation
	lengthValidation: true,         // Controls output length based on mode
	styleGuideChecks: true          // Enforces tone and formality
}
```

#### Text Sanitization

-   Removes think tags and markdown formatting
-   Normalizes whitespace and quotes
-   Preserves essential formatting elements
-   Maintains placeholder consistency
-   Handles bullet points and special characters

#### Length Control

| Mode     | tolerance | Description           |
| -------- | --------- | --------------------- |
| strict   | 0.1       | 10% deviation allowed |
| flexible | 0.3       | 30% deviation allowed |
| exact    | 0         | Exact length match    |
| loose    | 0.5       | 50% deviation allowed |

### Smart Context Detection

-   **Weighted Categories**: Different weights for context types
-   **Confidence Scoring**: Minimum threshold for category matching
-   **Fallback System**: Default to general translation when no context matches
-   **Debug Mode**: Detailed analysis of context detection
-   **Category Caching**: Optimized keyword matching

### Real-time Tracking

```
🔄 Progress: 72% | 360/500 files | ⏱️ 45.3s
✅ Successful: 340
❌ Failed: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Total Time: 45.3s
```

### Error Management

#### Advanced Error Handling

-   Automatic provider fallback system
-   Detailed error logging with provider-specific messages
-   Progress preservation on failure
-   Request queue management
-   Rate limiting per provider
-   Provider-specific error recovery

#### Fallback Provider Chain

1. Primary configured provider
2. Qwen
3. XAI
4. OpenAI
5. Azure DeepSeek
6. DeepSeek
7. Gemini

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
