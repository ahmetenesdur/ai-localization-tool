# AI Localization Tool

> **Enterprise-grade AI translation CLI for Next.js** — Intelligent synchronization, multi-provider support, and context-aware translations.

## ✨ Features

### 🤖 AI-Powered Translation

- **5 AI Providers**: OpenAI (GPT-4o), Gemini, DeepSeek, Dashscope, XAI
- **Intelligent Fallback**: Automatic provider switching on failures
- **Context Detection**: Auto-detects technical, marketing, legal, DeFi, and UI content

### ⚡ Performance & Quality

- **Smart Sync**: SHA-256 change detection for incremental updates
- **Parallel Processing**: Concurrent translations with rate limiting
- **LRU Cache**: Reduces API calls with stale-while-revalidate pattern
- **Quality Assurance**: Auto-validation and fixing of placeholders, HTML tags, length

### 📊 Developer Experience

- **Real-time Progress**: Live progress bars with ETA
- **Detailed Diagnostics**: Debug mode with performance metrics
- **Graceful Shutdown**: State preservation on interruption

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g ai-localization-tool

# Or use with npx (no installation)
npx ai-localization-tool
```

### Prerequisites

- **Node.js** >= 14.13.0 (v18+ recommended for ESM)
- At least one AI provider API key

## ⚙️ Configuration

### Step 1: Create Config File

Create `localize.config.js` in your project root:

```javascript
export default {
	// Basic Settings
	localesDir: "./locales",
	source: "en",
	targets: ["tr", "de", "es", "fr", "hi", "ja", "pl", "ru", "th", "uk", "vi", "yo", "zh"],

	// AI Provider
	apiProvider: "openai",
	useFallback: true,
	fallbackOrder: ["openai", "dashscope", "deepseek", "gemini", "xai"],

	// Performance
	concurrencyLimit: 1,
	cacheEnabled: true,

	// Context Detection
	context: {
		enabled: true,
		useAI: true,
		aiProvider: "openai",
		categories: {
			technical: {
				keywords: ["API", "backend", "database", "server", "endpoint"],
				prompt: "Preserve technical terms and variable names",
				weight: 1.3,
			},
			defi: {
				keywords: ["DeFi", "staking", "yield", "liquidity", "token", "blockchain"],
				prompt: "Keep DeFi terms in English",
				weight: 1.2,
			},
			marketing: {
				keywords: ["brand", "campaign", "customer", "audience", "promotion"],
				prompt: "Use persuasive and engaging language",
				weight: 1.1,
			},
			legal: {
				keywords: ["terms", "conditions", "privacy", "policy", "agreement"],
				prompt: "Maintain formal tone and precise legal terminology",
				weight: 1.4,
			},
			ui: {
				keywords: ["button", "click", "menu", "screen", "page", "view"],
				prompt: "Keep UI terms consistent and clear",
				weight: 1.2,
			},
		},
	},
};
```

### Step 2: Set API Keys

Create a `.env` file with your provider credentials:

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
DASHSCOPE_API_KEY=sk-...
XAI_API_KEY=xai-...
```

> **Note**: You only need one provider to get started. The tool will use the available providers.

## 📖 Usage

### Basic Commands

```bash
# Translate with config settings
localize

# Override target languages
localize -t tr,es,de

# Force update existing translations
localize translate --force

# Fix translation issues
localize fix

# Debug mode
localize --debug
```

### Smart Synchronization

The tool uses SHA-256 hashing to detect changes:

**First run:**

```bash
localize
# 🎉 First run - will process all keys
# Translates all 500 keys across 13 languages
```

**Subsequent runs:**

```bash
localize
# 🔄 Sync Analysis:
#    📝 New keys: 3
#    ✏️ Modified keys: 1
#    🗑️ Deleted keys: 2
# Only processes 4 keys instead of 500!
```

**Smart Behavior:**

- ✅ **New keys** → Translated automatically
- 🔄 **Modified keys** → Re-translated with context
- 🗑️ **Deleted keys** → Removed from all target files
- ⏭️ **Unchanged keys** → Skipped for performance

### Command Reference

<details>
<summary>📋 All Options</summary>

#### Global Options

| Option          | Description          | Default             |
| --------------- | -------------------- | ------------------- |
| `-s, --source`  | Source language      | `config.source`     |
| `-t, --targets` | Target languages     | `config.targets`    |
| `--localesDir`  | Locales directory    | `config.localesDir` |
| `--debug`       | Enable debug mode    | `false`             |
| `--verbose`     | Detailed diagnostics | `false`             |

#### Translation Options

| Option          | Description             | Default  |
| --------------- | ----------------------- | -------- |
| `--provider`    | AI provider             | `openai` |
| `--concurrency` | Concurrent translations | `1`      |
| `--force`       | Update existing         | `false`  |
| `--length`      | Length control mode     | `smart`  |
| `--stats`       | Show detailed stats     | `false`  |

</details>

## 🔧 Providers & Performance

| Provider      | Model                | RPM  | Concurrency | Context Window |
| ------------- | -------------------- | ---- | ----------- | -------------- |
| **OpenAI**    | gpt-4o               | 1000 | 15          | 16K tokens     |
| **Gemini**    | gemini-2.0-flash-exp | 500  | 12          | 16K tokens     |
| **XAI**       | grok-4               | 300  | 10          | 8K tokens      |
| **Dashscope** | qwen-plus            | 200  | 8           | 8K tokens      |
| **DeepSeek**  | deepseek-chat        | 200  | 8           | 8K tokens      |

### Quality Assurance

| Feature                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **Placeholder Validation** | Preserves `{variable}` patterns exactly                           |
| **HTML Preservation**      | Maintains `<tag>` structure and attributes                        |
| **Length Control**         | 5 modes with language-specific rules                              |
| **Context Detection**      | AI-powered categorization (technical, marketing, legal, DeFi, UI) |
| **Auto-Fix**               | Corrects common issues automatically                              |

### Progress Tracking

```bash
⠋ [tr] [█████═════════] 50.0% | 250/500 | ✅ 240 | ❌ 10 | ETA: 25s

📊 Translation Summary:
🔤 Language: tr
✅ Successful: 450 (90.0%)
❌ Failed: 50
⏱️ Total Time: 52.4s
⚡ Speed: 9.54 items/second
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run CLI locally
pnpm start

# Format with Prettier
pnpm format
pnpm format:check
```

### Project Structure

```
src/
├── commands/        # CLI commands (translate, fix, analyze)
├── core/           # Core orchestration and processing
│   ├── orchestrator.js       # Main translation engine
│   ├── provider-factory.js   # AI provider management
│   └── context-processor.js  # Context detection
├── providers/      # AI provider implementations
│   ├── openai.js
│   ├── gemini.js
│   └── ...
└── utils/          # Utilities (cache, rate-limit, quality)
```

## 📚 Advanced Configuration

<details>
<summary>🔍 Complete Configuration Reference</summary>

### Full Options

```javascript
/**
 * Localization Tool Configuration
 * Version: 2.0.0
 *
 * This configuration file controls all aspects of the localization tool
 * including API providers, performance settings, and quality controls.
 */

export default {
	// ===== BASIC CONFIGURATION =====
	version: "1.0.0", // Configuration version
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language code (ISO 639-1)
	targets: ["tr", "de", "es", "fr", "hi", "ja", "pl", "ru", "th", "uk", "vi", "yo", "zh"],

	// ===== API PROVIDER CONFIGURATION =====
	apiProvider: "openai", // Primary provider: openai, dashscope, deepseek, gemini, xai
	useFallback: true, // Enable automatic fallback to other providers
	fallbackOrder: ["openai", "dashscope", "deepseek", "gemini", "xai"], // Provider fallback chain

	// Individual provider configurations
	apiConfig: {
		deepseek: {
			model: "deepseek-chat", // Model name
			temperature: 0.1, // Creativity level (0.0-1.0)
			maxTokens: 2000, // Maximum tokens per request
			contextWindow: 8000, // Maximum context window size
		},
		openai: {
			model: "gpt-4o", // Latest optimized model
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000, // Larger context window
		},
		gemini: {
			model: "gemini-2.0-flash-exp", // Latest Gemini model
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
		dashscope: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		xai: {
			model: "grok-4",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
	},

	// ===== PERFORMANCE OPTIMIZATION =====
	concurrencyLimit: 1, // Maximum parallel translations (optimized for stability)
	cacheEnabled: true, // Enable translation caching
	cacheTTL: 24 * 60 * 60 * 1000, // Cache time-to-live (24 hours)
	cacheSize: 2000, // Maximum cached items

	// Rate Limiter Configuration (Speed Optimized)
	rateLimiter: {
		enabled: true,
		providerLimits: {
			openai: { rpm: 1000, concurrency: 15 }, // Aggressive limits for OpenAI
			deepseek: { rpm: 200, concurrency: 8 },
			gemini: { rpm: 500, concurrency: 12 }, // High-performance settings
			dashscope: { rpm: 200, concurrency: 8 },
			xai: { rpm: 300, concurrency: 10 },
		},
		queueStrategy: "fifo", // First-in-first-out for maximum speed
		adaptiveThrottling: false, // Disabled for consistent high performance
		queueTimeout: 10000, // Fast timeout (10 seconds)
	},

	// ===== ERROR HANDLING & RELIABILITY =====
	retryOptions: {
		maxRetries: 2, // Global retry attempts
		initialDelay: 1000, // Initial delay before retry (ms)
		maxDelay: 10000, // Maximum delay cap (ms)
		jitter: true, // Add randomization to retry delays
		retryableErrors: ["rate_limit", "timeout", "network", "server", "unknown"],
		perProviderRetry: {
			dashscope: { maxRetries: 3 }, // Provider-specific retry settings
			openai: { maxRetries: 2 },
		},
	},

	// ===== CONTEXT-AWARE TRANSLATION =====
	context: {
		enabled: true, // Enable context detection
		useAI: true, // Use AI for context analysis
		aiProvider: "openai", // AI provider for context analysis
		minTextLength: 50, // Minimum text length for AI analysis
		allowNewCategories: true, // Allow AI to suggest new categories
		debug: false, // Enable detailed context analysis logs

		// AI Analysis Configuration
		analysisOptions: {
			model: "gpt-4o", // OpenAI model for context analysis
			temperature: 0.2, // Lower temperature for consistent analysis
			maxTokens: 1000, // Tokens for analysis
		},

		// Detection Thresholds
		detection: {
			threshold: 2, // Minimum keyword matches for category
			minConfidence: 0.6, // Minimum confidence score (0.0-1.0)
		},

		// Content Categories with Keywords and Prompts
		categories: {
			technical: {
				keywords: [
					"API",
					"backend",
					"database",
					"server",
					"endpoint",
					"function",
					"method",
					"class",
					"object",
					"variable",
				],
				prompt: "Preserve technical terms and variable names",
				weight: 1.3,
			},
			defi: {
				keywords: [
					"DeFi",
					"staking",
					"yield",
					"liquidity",
					"token",
					"blockchain",
					"crypto",
					"wallet",
					"smart contract",
				],
				prompt: "Keep DeFi terms in English",
				weight: 1.2,
			},
			marketing: {
				keywords: [
					"brand",
					"campaign",
					"customer",
					"audience",
					"promotion",
					"value",
					"benefit",
					"feature",
				],
				prompt: "Use persuasive and engaging language appropriate for marketing content",
				weight: 1.1,
			},
			legal: {
				keywords: [
					"terms",
					"conditions",
					"privacy",
					"policy",
					"agreement",
					"compliance",
					"regulation",
					"law",
				],
				prompt: "Maintain formal tone and precise legal terminology",
				weight: 1.4,
			},
			ui: {
				keywords: [
					"button",
					"click",
					"menu",
					"screen",
					"page",
					"view",
					"interface",
					"select",
					"tap",
				],
				prompt: "Keep UI terms consistent and clear, maintain proper formatting for UI elements",
				weight: 1.2,
			},
		},

		// Fallback for unmatched content
		fallback: {
			category: "general",
			prompt: "Provide a natural translation",
		},
	},

	// ===== QUALITY ASSURANCE =====
	qualityChecks: {
		enabled: true, // Enable quality validation
		rules: {
			placeholderConsistency: true, // Validate {{placeholders}}
			htmlTagsConsistency: true, // Preserve <HTML> tags
			punctuationCheck: true, // Check punctuation consistency
			lengthValidation: true, // Validate translation length
			sanitizeOutput: true, // Clean AI artifacts
			markdownPreservation: true, // Preserve markdown formatting
			specialCharacters: true, // Maintain special characters
			codeBlockPreservation: true, // Preserve code blocks
		},
		autoFix: true, // Automatically fix detected issues
	},

	// ===== STYLE GUIDE =====
	styleGuide: {
		formality: "neutral", // Options: formal, neutral, informal
		toneOfVoice: "professional", // Options: professional, friendly, casual, technical
		conventions: {
			useOxfordComma: true, // Use Oxford comma in lists
			useSentenceCase: true, // Use sentence case for headings
		},
	},

	// ===== LENGTH CONTROL =====
	lengthControl: {
		mode: "smart", // Options: strict, flexible, exact, relaxed, smart
		rules: {
			strict: 0.1, // 10% deviation allowed
			flexible: 0.3, // 30% deviation allowed
			exact: 0.05, // 5% deviation allowed
			relaxed: 0.5, // 50% deviation allowed
			smart: {
				default: 0.15, // Default tolerance
				// Language-specific rules
				byLanguage: {
					ja: { max: 0.35, min: -0.2 }, // Japanese: +35% / -20%
					zh: { max: 0.35, min: -0.2 }, // Chinese: +35% / -20%
					th: { max: 0.3, min: -0.15 }, // Thai: +30% / -15%
					vi: { max: 0.25, min: -0.15 }, // Vietnamese: +25% / -15%
					hi: { max: 0.2, min: -0.1 }, // Hindi: +20% / -10%
					ru: { max: 0.25, min: -0.15 }, // Russian: +25% / -15%
					uk: { max: 0.25, min: -0.15 }, // Ukrainian: +25% / -15%
					pl: { max: 0.2, min: -0.1 }, // Polish: +20% / -10%
					de: { max: 0.15, min: -0.1 }, // German: +15% / -10%
					fr: { max: 0.15, min: -0.1 }, // French: +15% / -10%
					es: { max: 0.15, min: -0.1 }, // Spanish: +15% / -10%
					tr: { max: 0.15, min: -0.1 }, // Turkish: +15% / -10%
				},
				// Context-specific rules
				byContext: {
					technical: { max: 0.2, min: -0.1 }, // Technical: +20% / -10%
					marketing: { max: 0.3, min: -0.15 }, // Marketing: +30% / -15%
					legal: { max: 0.1, min: -0.05 }, // Legal: +10% / -5%
					general: { max: 0.15, min: -0.1 }, // General: +15% / -10%
				},
			},
		},
	},

	// ===== FILE OPERATIONS =====
	fileOperations: {
		atomic: true, // Use atomic file operations (safer)
		createMissingDirs: true, // Auto-create missing directories
		backupFiles: false, // Create backups before modifying
		backupDir: "./backups", // Backup directory
		encoding: "utf8", // File encoding
		jsonIndent: 2, // JSON indentation spaces
	},

	// ===== LOGGING & DIAGNOSTICS =====
	logging: {
		verbose: false, // Disable verbose logging for cleaner output
		diagnosticsLevel: "minimal", // Options: minimal, normal, detailed
		outputFormat: "pretty", // Options: pretty, json, minimal
		saveErrorLogs: true, // Save error logs to file
		logDirectory: "./logs", // Directory for log files
		includeTimestamps: true, // Include timestamps in logs
		logRotation: {
			enabled: true, // Enable log rotation
			maxFiles: 5, // Maximum log files to keep
			maxSize: "10MB", // Maximum log file size
		},
	},

	// ===== SYNCHRONIZATION =====
	syncOptions: {
		enabled: true, // Enable sync features
		removeDeletedKeys: true, // Remove deleted keys from target files
		retranslateModified: true, // Re-translate modified keys
		backupBeforeSync: false, // Create backup before sync operations
	},

	// ===== ADVANCED SETTINGS =====
	advanced: {
		timeoutMs: 15000, // Request timeout (15 seconds)
		maxKeyLength: 10000, // Maximum key length for translation
		maxBatchSize: 30, // Maximum batch size for operations
		autoOptimize: true, // Auto-optimize settings for hardware
		debug: false, // Enable debug mode
	},
};
```

### Key Configuration Categories

| Category        | Key Options                           | Description                             |
| --------------- | ------------------------------------- | --------------------------------------- |
| **Performance** | `concurrencyLimit`, `rateLimiter`     | Parallel processing and rate limiting   |
| **AI Context**  | `context.useAI`, `context.categories` | AI-powered content categorization       |
| **Quality**     | `qualityChecks`, `lengthControl`      | Validation rules and auto-fixing        |
| **Sync**        | `syncOptions.removeDeletedKeys`       | Smart synchronization behavior          |
| **Providers**   | `apiConfig`, `fallbackOrder`          | AI provider settings and fallback chain |

</details>

## 🤝 Contributing

## Contributions are welcome! Please feel free to submit a Pull Request.

---

[![GitHub](https://img.shields.io/badge/GitHub-ahmetenesdur-blue?logo=github)](https://github.com/ahmetenesdur)
