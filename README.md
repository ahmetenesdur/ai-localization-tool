# Localization Tool

Advanced AI-powered translation CLI tool for Next.js projects. Supports multiple languages, quality controls, and integration with 6 different AI providers.

## 📦 Installation

```bash
npm install -g localization-tool
# Or
npx localization-tool
```

## ⚙️ Configuration

Customize using `localize.config.js`:

```javascript
module.exports = {
	localesDir: "./locales",
	source: "en",
	targets: ["tr", "es", "de"],
	apiProvider: "qwen",
	context: {
		enabled: true,
		categories: {
			technical: ["blockchain", "API", "smart contract"],
		},
	},
	qualityChecks: true,
};
```

## 🚀 Usage

```bash
localize --source en --targets tr,es --localesDir ./src/locales
```

**Core Commands:**

- `--apiProvider`: Qwen, OpenAI, Gemini, DeepSeek, AzureDeepSeek
- `--lengthControl`: strict/flexible/exact/loose
- `--useFallback`: true/false

## 🌟 Features

### Multi-Provider Support

| Provider       | Model Options       | RPM Limit |
| -------------- | ------------------- | --------- |
| Qwen           | qwen-plus           | 50        |
| OpenAI         | gpt-4o, gpt-4-turbo | 60        |
| Gemini         | gemini-1.5-flash    | 100       |
| DeepSeek       | deepseek-chat       | 45        |
| Azure DeepSeek | DeepSeek-R1         | 80        |

### Smart Features

- 🔍 Contextual Translation (Automatic category detection via keyword matching)
- 🛡️ Quality Controls:
    ```javascript
    {
      placeholderConsistency: true,  // {variable} validation
      htmlTagsConsistency: true,     // <b>tag</b> verification
      punctuationCheck: true,        // Ending punctuation match
      lengthValidation: true         // Text length optimization
    }
    ```
- 📈 Real-Time Progress Tracking:
    ```
    Progress: 72% | 360/500 | 45.3s
    ```

## 🗃️ Cache Management

Translations are automatically stored in `.translation-cache/cache.json`:

```json
{
	"md5hash": {
		"translation": "Hello World",
		"timestamp": "2024-03-15T14:22:35.123Z"
	}
}
```

## 🔧 Advanced Settings

Add API keys to `.env` file:

```env
QWEN_API_KEY=sk-xxxx
OPENAI_API_KEY=sk-yyyy
DEEPSEEK_API_KEY=sk-zzzz
AZURE_DEEPSEEK_API_KEY=sk-zzzz
GEMINI_API_KEY=sk-zzzz
```

## 🛠️ Error Handling

**Fallback Mechanism:**

1. Primary provider (Qwen)
2. OpenAI
3. Gemini
4. DeepSeek
5. Azure DeepSeek

Error example:

```bash
[ERROR] Translation failed - Attempting fallback... (3 providers remaining)
```

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
