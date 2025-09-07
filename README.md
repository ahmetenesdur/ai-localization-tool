# AI Localization Tool

**Enterprise-grade AI-powered translation CLI for Next.js projects** with intelligent synchronization, multi-provider support, and context-aware translations.

## Key Features

- **AI-Powered Translation** - 5 providers with intelligent fallback (OpenAI, DeepSeek, Gemini, etc.)
- **Smart Synchronization** - SHA-256 change detection, incremental updates, cache management
- **Context-Aware** - Automatically detects technical, marketing, legal content
- **High Performance** - Concurrent processing, caching, rate limiting
- **Quality Assured** - Built-in validation, auto-fixing, length control
- **Real-time Progress** - Detailed statistics and progress tracking

## Quick Start

```bash
# Install globally
npm install -g ai-localization-tool

# Or use directly
npx ai-localization-tool
```

## Configuration

### 1. Create Configuration File

Create `localize.config.js` in your project root (JavaScript version - simpler for most users):

```javascript
module.exports = {
	// Basic Settings
	localesDir: "./locales",
	source: "en",
	targets: ["tr", "de", "es", "fr", "ja", "zh"],

	// AI Provider
	apiProvider: "deepseek",
	useFallback: true,

	// Performance
	concurrencyLimit: 5,
	cacheEnabled: true,

	// Context Detection
	context: {
		enabled: true,
		useAI: true,
		categories: {
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Preserve technical terms",
			},
			marketing: {
				keywords: ["brand", "campaign", "customer"],
				prompt: "Use engaging language",
			},
		},
	},
};
```

Or use `localize.config.ts` if you prefer TypeScript with full type safety:

```typescript
export default {
	// Basic Settings
	localesDir: "./locales",
	source: "en",
	targets: ["tr", "de", "es", "fr", "ja", "zh"],

	// AI Provider
	apiProvider: "deepseek",
	useFallback: true,

	// Performance
	concurrencyLimit: 5,
	cacheEnabled: true,

	// Context Detection
	context: {
		enabled: true,
		useAI: true,
		categories: {
			technical: {
				keywords: ["API", "backend", "database"],
				prompt: "Preserve technical terms",
			},
			marketing: {
				keywords: ["brand", "campaign", "customer"],
				prompt: "Use engaging language",
			},
		},
	},
} satisfies import("./src/types").LocalizationConfig;
```

### 2. Set API Keys

Create `.env` file:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
DASHSCOPE_API_KEY=your_key_here
XAI_API_KEY=your_key_here
```

## Usage

### Basic Commands

```bash
# Translate with config settings
npx ts-node -r tsconfig-paths/register bin/localize.ts

# Override target languages
npx ts-node -r tsconfig-paths/register bin/localize.ts -t tr,es,de

# Force update existing translations
npx ts-node -r tsconfig-paths/register bin/localize.ts translate --force

# Fix translation issues
npx ts-node -r tsconfig-paths/register bin/localize.ts fix

# Debug mode
npx ts-node -r tsconfig-paths/register bin/localize.ts --debug
```

### Intelligent Synchronization

The tool automatically detects changes in your source files using SHA-256 hash-based state management:

```bash
# First run - processes all keys
npx ts-node -r tsconfig-paths/register bin/localize.ts
# → First run - will process all keys

# After modifying source file
npx ts-node -r tsconfig-paths/register bin/localize.ts
# 🔄 Sync Analysis:
#    📝 New keys: 3
#    ✏️  Modified keys: 1
#    🗑️ Deleted keys: 2
```

**What happens:**

- **New keys** → Translated automatically
- **Modified keys** → Re-translated with context
- **Deleted keys** → Removed from all target files
- **Unchanged keys** → Skipped for performance

**Cache Management:**

- State is tracked in `.localize-cache/localization.state.json`
- SHA-256 hashes detect content changes
- Metadata includes timestamps and version info
- Automatic cleanup of stale cache entries

### Advanced Features

<details>
<summary>Command Options</summary>

#### Global Options

| Option          | Description          | Default             |
| --------------- | -------------------- | ------------------- |
| `-s, --source`  | Source language      | `config.source`     |
| `-t, --targets` | Target languages     | `config.targets`    |
| `--localesDir`  | Locales directory    | `config.localesDir` |
| `--debug`       | Enable debug mode    | `false`             |
| `--verbose`     | Detailed diagnostics | `false`             |

#### Translation Options

| Option          | Description             | Default    |
| --------------- | ----------------------- | ---------- |
| `--provider`    | AI provider             | `deepseek` |
| `--concurrency` | Concurrent translations | `5`        |
| `--force`       | Update existing         | `false`    |
| `--length`      | Length control mode     | `smart`    |
| `--stats`       | Show detailed stats     | `false`    |

</details>

## Performance & Quality

### Supported Providers

| Provider      | Model                 | RPM | Concurrency | Context Window |
| ------------- | --------------------- | --- | ----------- | -------------- |
| **DeepSeek**  | deepseek-chat         | 60  | 3           | 8K tokens      |
| **OpenAI**    | gpt-4o-mini           | 60  | 3           | 16K tokens     |
| **Gemini**    | gemini-2.5-flash-lite | 100 | 3           | 16K tokens     |
| **Dashscope** | qwen-plus             | 50  | 3           | 8K tokens      |
| **XAI**       | grok-2-1212           | 60  | 3           | 8K tokens      |

### Quality Features

- **Placeholder validation** - Ensures `{{variables}}` consistency
- **HTML preservation** - Maintains `<tags>` structure
- **Length control** - 5 modes (strict, flexible, smart, etc.)
- **Context detection** - Technical, marketing, legal content
- **Auto-fixing** - Corrects common translation issues

### Real-time Progress

```
[tr] [█████=====     ] 50.0% | 250/500 | ✅ 240 | ❌ 10 | ⏱️ 25.3s

📊 Translation Summary:
🔤 Language: tr
✅ Successful: 450 (90.0%)
❌ Failed: 50
⏱️ Total Time: 52.4s
⚡ Speed: 9.54 items/second
```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm start

# Format code
pnpm format

# Build TypeScript
npm run build
```

## Advanced Configuration

<details>
<summary>Complete Configuration Reference</summary>

### Full Configuration Options

Here's the complete configuration file with all available options and their explanations:

```javascript
/**
 * Localization Tool Configuration
 * Version: 1.0.0
 *
 * This configuration file controls all aspects of the localization tool
 * including API providers, performance settings, and quality controls.
 */

module.exports = {
	// ===== BASIC CONFIGURATION =====
	version: "1.0.0", // Configuration version
	localesDir: "./locales", // Directory where locale JSON files are stored
	source: "en", // Source language code (ISO 639-1)
	targets: ["tr", "de", "es", "fr", "hi", "ja", "pl", "ru", "th", "uk", "vi", "yo", "zh"],

	// ===== API PROVIDER CONFIGURATION =====
	apiProvider: "deepseek", // Primary provider: deepseek, openai, gemini, dashscope, xai
	useFallback: true, // Enable automatic fallback to other providers
	fallbackOrder: ["deepseek", "openai", "gemini"], // Provider fallback chain

	// Individual provider configurations
	apiConfig: {
		deepseek: {
			model: "deepseek-chat", // Model name
			temperature: 0.1, // Creativity level (0.0-1.0)
			maxTokens: 2000, // Maximum tokens per request
			contextWindow: 8000, // Maximum context window size
		},
		openai: {
			model: "gpt-4o-mini", // Latest optimized model
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000, // Larger context window
		},
		gemini: {
			model: "gemini-2.5-flash-lite", // Latest Gemini model
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
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
	},

	// ===== PERFORMANCE OPTIMIZATION =====
	concurrencyLimit: 15, // Maximum parallel translations (optimized for speed)
	cacheEnabled: true, // Enable translation caching
	cacheTTL: 24 * 60 * 60 * 1000, // Cache time-to-live (24 hours)
	cacheSize: 2000, // Maximum cached items

	// Rate Limiter Configuration (Speed Optimized)
	rateLimiter: {
		enabled: true,
		providerLimits: {
			openai: { rpm: 1200, concurrency: 20 }, // Aggressive limits for OpenAI
			deepseek: { rpm: 150, concurrency: 8 },
			gemini: { rpm: 1000, concurrency: 20 }, // High-performance settings
			dashscope: { rpm: 200, concurrency: 8 },
			xai: { rpm: 250, concurrency: 8 },
		},
		queueStrategy: "fifo", // First-in-first-out for maximum speed
		adaptiveThrottling: false, // Disabled for consistent high performance
		queueTimeout: 8000, // Fast timeout (8 seconds)
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
			model: "gpt-4o-mini", // OpenAI model for context analysis
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
		verbose: false, // Enable verbose logging
		diagnosticsLevel: "normal", // Options: minimal, normal, detailed
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
		stateDir: ".localize-cache", // Directory for state cache
		stateFileName: "localization.state.json", // State file name
	},

	// ===== ADVANCED SETTINGS =====
	advanced: {
		timeoutMs: 30000, // Request timeout (30 seconds)
		maxKeyLength: 10000, // Maximum key length for translation
		maxBatchSize: 30, // Maximum batch size for operations
		autoOptimize: true, // Auto-optimize settings for hardware
		debug: false, // Enable debug mode
	},
};
```

### Configuration Categories Explained

#### Performance Settings

- **concurrencyLimit**: Number of parallel translations (15 = high performance)
- **rateLimiter.providerLimits**: Provider-specific RPM and concurrency limits
- **queueStrategy**: "fifo" for speed, "priority" for importance-based processing
- **adaptiveThrottling**: Disabled for consistent maximum performance

#### AI Context Detection

- **context.useAI**: Enable AI-powered context analysis
- **context.categories**: Define content types with keywords and prompts
- **context.analysisOptions**: Configure AI model for context detection
- **context.detection**: Set thresholds for category matching

#### Quality Control

- **qualityChecks.rules**: Enable specific validation rules
- **autoFix**: Automatically correct detected issues
- **lengthControl**: Smart length management with language-specific rules

#### Smart Synchronization

- **syncOptions**: Control how changes are synchronized
- **removeDeletedKeys**: Auto-cleanup of deleted translations
- **retranslateModified**: Re-translate changed content
- **State Management**: Hash-based change detection in `.localize-cache`

#### Cache Management

The tool implements an intelligent caching system to optimize performance:

- **State Tracking**: Changes are tracked using SHA-256 hashes in `.localize-cache/`
- **Incremental Processing**: Only processes new or modified keys
- **Metadata Storage**: Timestamps and version information for audit trails
- **Automatic Cleanup**: Stale cache entries are automatically managed

```
.localize-cache/
└── localization.state.json    # State file with hashes and metadata
```

The cache system works by:

1. **Hash Generation**: SHA-256 hashes are generated for each translation key's content
2. **State Comparison**: Previous and current states are compared to detect changes
3. **Selective Processing**: Only new or modified keys are sent for translation
4. **Cache Updates**: State file is updated with current hashes after processing

This approach significantly reduces API costs and processing time by avoiding redundant translations.

#### Provider Configuration

- **apiConfig**: Model-specific settings for each provider
- **fallbackOrder**: Define provider chain for reliability
- **retryOptions**: Configure retry behavior and error handling

</details>

## Recent Updates

### User-Friendly Configuration Options

✅ **JavaScript Configuration Support** - Users can now use `localize.config.js` for simpler setup without TypeScript  
✅ **TypeScript Configuration Support** - Advanced users can still use `localize.config.ts` with full type safety  
✅ **Automatic Config Detection** - Tool automatically detects and loads `.js`, `.ts`, or `.cjs` configuration files

### TypeScript Migration Complete

✅ All JavaScript files have been successfully migrated to TypeScript  
✅ Full type safety and improved code quality  
✅ Better developer experience with enhanced IntelliSense

### Verified Functionality

✅ Environment variables loading correctly from `.env.local`  
✅ Translation from English to multiple languages working  
✅ Proper JSON structure preservation  
✅ API provider integration (DeepSeek, OpenAI, Gemini, DashScope, XAI)

### Working Example

The tool has been successfully tested with the `en.json` file, generating accurate translations for Turkish and Spanish locales while maintaining the original JSON structure.

---

[![GitHub](https://img.shields.io/badge/GitHub-ahmetenesdur-blue?logo=github)](https://github.com/ahmetenesdur)
