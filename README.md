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
	fallbackOrder: ["dashscope", "xai", "openai", "azuredeepseek", "deepseek", "gemini"], // Provider fallback order

	// API Configuration
	apiConfig: {
		dashscope: {
			model: "qwen-plus",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000, // Maximum context window size
		},
		xai: {
			model: "grok-2-1212",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		openai: {
			model: "gpt-4o",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
		azuredeepseek: {
			model: "DeepSeek-R1",
			temperature: 0.1,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		deepseek: {
			model: "deepseek-chat",
			temperature: 0.1,
			maxTokens: 2000,
			contextWindow: 8000,
		},
		gemini: {
			model: "gemini-1.5-flash",
			temperature: 0.3,
			maxTokens: 2000,
			contextWindow: 16000,
		},
	},

	// Rate Limiter Configuration
	rateLimiter: {
		enabled: true, // Enable rate limiting
		providerLimits: {
			dashscope: { rpm: 50, concurrency: 4 }, // Requests per minute & concurrency
			xai: { rpm: 60, concurrency: 5 },
			openai: { rpm: 60, concurrency: 5 },
			azuredeepseek: { rpm: 80, concurrency: 5 },
			deepseek: { rpm: 45, concurrency: 3 },
			gemini: { rpm: 100, concurrency: 8 },
		},
		queueStrategy: "priority", // priority, fifo
		adaptiveThrottling: true, // Auto-adjust based on API responses
		queueTimeout: 30000, // Maximum time in queue before timing out (ms)
	},

	// Translation Context
	context: {
		enabled: true,
		detection: {
			threshold: 2, // Minimum keyword matches
			minConfidence: 0.6, // Minimum confidence score
		},
		aiProvider: "deepseek", // AI provider for context analysis
		minTextLength: 50, // Minimum text length for AI analysis
		allowNewCategories: true, // Allow AI to suggest new categories
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
			markdownPreservation: true, // Preserve markdown formatting
			specialCharacters: true, // Maintain special characters
			codeBlockPreservation: true, // Preserve code blocks
		},
		autoFix: true, // Auto-fix common issues
	},

	// Style Settings
	styleGuide: {
		formality: "neutral", // formal, neutral, informal
		toneOfVoice: "professional", // friendly, professional, technical
		conventions: {
			useOxfordComma: true,
			useSentenceCase: true,
		},
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

	// File Operations
	fileOperations: {
		atomic: true, // Use atomic file operations
		createMissingDirs: true, // Create missing directories
		backupFiles: true, // Create backups before modifying
		backupDir: "./backups", // Backup directory
		encoding: "utf8", // File encoding
		jsonIndent: 2, // JSON indentation spaces
	},

	// Logging and Diagnostics
	logging: {
		verbose: false, // Enable verbose logging
		diagnosticsLevel: "normal", // minimal, normal, detailed
		outputFormat: "pretty", // pretty, json, minimal
		saveErrorLogs: true, // Save error logs to file
		logDirectory: "./logs", // Directory for log files
		includeTimestamps: true, // Include timestamps in logs
		logRotation: {
			enabled: true,
			maxFiles: 5,
			maxSize: "10MB",
		},
	},

	// Performance Settings
	concurrencyLimit: 5, // Number of concurrent translations
	cacheEnabled: true, // Enable translation caching
	cacheSize: 1000, // Maximum number of cached items
	cacheTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

	// Retry Options
	retryOptions: {
		maxRetries: 2, // Maximum number of retries for API calls
		initialDelay: 1000, // Initial delay in ms before retry
		maxDelay: 10000, // Maximum delay cap for backoff
		jitter: true, // Enable jitter for exponential backoff
		retryableErrors: ["rate_limit", "timeout", "network"], // Error types to retry
	},

	// Synchronization Settings
	syncOptions: {
		enabled: true, // Enable synchronization features
		removeDeletedKeys: true, // Remove deleted keys from target files
		retranslateModified: true, // Re-translate modified keys
		backupBeforeSync: false, // Create backup before sync operations
	},

	// Advanced Settings
	advanced: {
		timeoutMs: 60000, // Request timeout (60 seconds)
		maxKeyLength: 10000, // Maximum key length
		maxBatchSize: 50, // Maximum batch size for operations
		autoOptimize: true, // Automatically optimize settings
		debug: false, // Enable debug mode
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

The tool automatically reads configuration from `localize.config.js` and supports command-line overrides:

```bash
# Command Structure
localize [global options] [command] [command options]
```

### Configuration Priority

Settings are applied in this order (highest to lowest priority):

1. **Command line parameters** (highest priority)
2. **Config file** (`localize.config.js`)
3. **Default values** (lowest priority)

### Basic Usage Examples

```bash
# Use all settings from config file (recommended)
localize

# Use config but override specific languages
localize -t tr,es,de

# Use config but different source language
localize -s tr

# Completely override config
localize -s en -t tr,de,es --localesDir ./src/locales

# With debug mode
localize --debug

# Verbose mode for detailed logging
localize --verbose
```

### Global Options

Options that apply to all commands:

| Option        | Description                        | Default (from config) |
| ------------- | ---------------------------------- | --------------------- |
| -s, --source  | Source language                    | config.source         |
| -t, --targets | Target languages (comma separated) | config.targets        |
| --localesDir  | Locales directory                  | config.localesDir     |
| --debug       | Enable verbose logging             | false                 |
| --verbose     | Enable detailed diagnostics        | false                 |

### Commands and Examples

#### Synchronization Workflow

The tool automatically detects and handles changes in your source locale file:

```bash
# First run - processes all keys using config settings
localize
# Output: 🆕 First run - will process all keys

# Subsequent runs - only processes changes
localize
# Output: ✅ No changes detected in source file

# After modifying source file (adding, changing, or deleting keys)
localize
# Output:
# 🔄 Sync Analysis:
#    📝 New keys: 3
#    ✏️  Modified keys: 1
#    🗑️  Deleted keys: 2
#
# 🗑️ Removing 2 deleted keys from target files...
#    ✅ tr.json: Removed 2 keys
#    ✅ de.json: Removed 2 keys
#    ✅ es.json: Removed 2 keys
#    # ... all target languages
```

**What happens during sync:**

1. **Deleted Keys** → Automatically removed from all target files
2. **Modified Keys** → Re-translated in all target languages
3. **New Keys** → Translated normally
4. **Unchanged Keys** → Skipped for performance

#### Translate (Default Command)

Translate missing strings or update translations:

```bash
# Basic translation using config settings (recommended)
localize

# With specific provider override
localize --provider openai

# Force update existing translations (ignores sync)
localize translate --force

# Control translation length mode
localize translate --length strict

# Auto-optimize for your hardware
localize translate --auto-optimize

# Show detailed statistics
localize translate --stats

# Override specific languages while keeping other config
localize -t tr,es,de

# Complete manual override
localize -s en -t tr,es --provider openai --concurrency 8
```

#### Fix

Fix issues in existing translations:

```bash
# Fix length issues using config settings
localize fix

# Fix with debug output
localize fix --debug

# Fix specific languages only
localize -t tr,es fix
```

#### Analyze

Analyze context patterns in translations:

```bash
# Analyze context using AI with config settings (OpenAI by default)
localize analyze --use-ai

# Specify different context provider
localize analyze --use-ai --context-provider deepseek

# Adjust threshold for matching
localize analyze --context-threshold 3

# Analyze specific language pair
localize -s en -t tr analyze --use-ai
```

#### Advanced

Access rarely used configuration options:

```bash
# Fine-tune context detection with config base
localize advanced --context-confidence 0.7 --min-text-length 60

# Allow new category suggestions
localize advanced --allow-new-categories

# Configure retries and timeouts
localize advanced --max-retries 3 --initial-delay 2000 --max-delay 20000

# Set advanced timeouts and batch sizes
localize advanced --timeout 120000 --max-batch-size 30

# Override for specific language pair
localize -s en -t tr advanced --context-confidence 0.7
```

### CLI Reference

#### Configuration-Based Usage

The tool now prioritizes configuration file settings, making commands much simpler:

**Recommended Usage:**

```bash
localize                    # Use all config settings
localize -t tr,es          # Override just target languages
localize --provider openai # Override just the provider
```

**Legacy Manual Usage (still supported):**

```bash
localize -s en -t tr,de,es --localesDir ./locales
```

#### Global Options

| Option        | Description                        | Config Property | CLI Default       |
| ------------- | ---------------------------------- | --------------- | ----------------- |
| -s, --source  | Source language                    | source          | config.source     |
| -t, --targets | Target languages (comma separated) | targets         | config.targets    |
| --localesDir  | Locales directory                  | localesDir      | config.localesDir |
| --debug       | Enable verbose logging             | advanced.debug  | false             |
| --verbose     | Enable detailed diagnostics        | logging.verbose | false             |

#### Translate Command Options

| Option          | Description                  | Default   |
| --------------- | ---------------------------- | --------- |
| --provider      | Translation provider         | dashscope |
| --concurrency   | Concurrent translations      | 5         |
| --no-cache      | Disable translation caching  | false     |
| --force         | Update existing translations | false     |
| --length        | Length control mode          | smart     |
| --auto-optimize | Optimize for your hardware   | false     |
| --stats         | Show detailed statistics     | false     |

#### Fix Command Options

| Option   | Description       | Default |
| -------- | ----------------- | ------- |
| --length | Fix length issues | true    |

#### Sync Configuration Options

Configure synchronization behavior in `localize.config.js`:

```javascript
syncOptions: {
    enabled: true, // Enable/disable sync features entirely
    removeDeletedKeys: true, // Remove deleted keys from target files
    retranslateModified: true, // Re-translate modified keys
    backupBeforeSync: false, // Create backups before sync operations
}
```

**Sync Options:**

| Option              | Description                                   | Default |
| ------------------- | --------------------------------------------- | ------- |
| enabled             | Enable synchronization features               | true    |
| removeDeletedKeys   | Remove deleted keys from target files         | true    |
| retranslateModified | Re-translate keys when source content changes | true    |
| backupBeforeSync    | Create backup files before sync operations    | false   |

**State File Management:**

The tool creates a `.localize-cache/` directory to store translation state. This directory is automatically added to `.gitignore` and should not be committed to version control.

**Real-World Example:**

```json
// Before: en.json
{
  "welcome": "Welcome!",
  "goodbye": "Goodbye!",
  "hello": "Hello World"
}

// You modify en.json:
// - Delete "goodbye" key
// - Change "hello" to "Hello Universe"
// - Add "new_feature" key

// After: en.json
{
  "welcome": "Welcome!",
  "hello": "Hello Universe",
  "new_feature": "Check out our new feature!"
}

// Running: localize
// Result:
// 🔄 Sync Analysis:
//    📝 New keys: 1 (new_feature)
//    ✏️  Modified keys: 1 (hello)
//    🗑️  Deleted keys: 1 (goodbye)
//
// 🗑️ Removing 1 deleted keys from target files...
//    ✅ tr.json: Removed 1 keys
//    ✅ de.json: Removed 1 keys
//    ✅ es.json: Removed 1 keys
//    # ... all languages
//
// 📝 Processing 1 new keys + 1 modified keys = 2 total translations needed
```

**Performance Benefits:**

- **Incremental Processing**: Only processes changed content (2 keys instead of all 3)
- **Faster Runs**: Skips unchanged translations ("welcome" key skipped)
- **Automatic Cleanup**: Removes orphaned translations ("goodbye" removed from all files)
- **Consistent State**: Maintains synchronization across team members

#### Analyze Command Options

| Option              | Description                | Default |
| ------------------- | -------------------------- | ------- |
| --use-ai            | Enable AI context analysis | true    |
| --context-provider  | AI provider for analysis   | openai  |
| --context-threshold | Keyword match threshold    | 2       |

#### Advanced Command Options

| Option                 | Description                    | Default |
| ---------------------- | ------------------------------ | ------- |
| --context-confidence   | Minimum confidence score       | 0.6     |
| --context-debug        | Show detailed context analysis | false   |
| --min-text-length      | Minimum text for AI analysis   | 40      |
| --allow-new-categories | Allow AI to suggest categories | false   |
| --max-retries          | Maximum retry attempts         | 2       |
| --initial-delay        | Initial delay before retry     | 1000    |
| --max-delay            | Maximum delay for backoff      | 10000   |
| --timeout              | Request timeout in ms          | 60000   |
| --max-batch-size       | Max items per batch            | 50      |

## 🌟 Features

### Smart Synchronization System

- **Intelligent Change Detection**: SHA-256 hash-based comparison for precise change tracking
- **Automatic Key Cleanup**: Removes deleted keys from all target language files
- **Smart Re-translation**: Re-translates only modified keys with AI context analysis
- **State Management**: Persistent state tracking in `.localize-cache/` directory
- **Performance Optimized**: Processes only changed content for faster runs
- **AI Context Integration**: Uses OpenAI for intelligent context-aware translations
- **Backward Compatibility**: Works seamlessly with existing projects

The tool now tracks changes in your source locale file and synchronizes them across all target languages with AI-powered context analysis:

```bash
# Example output showing sync detection with AI context analysis
🧠 AI Context Analysis: ENABLED (Provider: openai)
🔄 New category suggestions: ENABLED

🔄 Sync Analysis:
   📝 New keys: 5
   ✏️  Modified keys: 2
   🗑️  Deleted keys: 1

🗑️ Removing 1 deleted keys from target files...
   ✅ tr.json: Removed 1 keys
   ✅ es.json: Removed 1 keys

🧠 AI Context Analysis: defi (85.2%)
📝 Processing 7 keys with intelligent context detection...
```

### Provider Integration

| Provider       | Base Model       | RPM Limit | Concurrent | Fallback Order |
| -------------- | ---------------- | --------- | ---------- | -------------- |
| Dashscope      | qwen-plus        | 50        | 4          | 1              |
| XAI            | grok-2-1212      | 60        | 5          | 2              |
| OpenAI         | gpt-4o           | 60        | 5          | 3              |
| Azure DeepSeek | DeepSeek-R1      | 80        | 5          | 4              |
| DeepSeek       | deepseek-chat    | 60        | 5          | 5              |
| Gemini         | gemini-1.5-flash | 100       | 8          | 6              |

### Performance Optimizations

- **Enhanced Rate Limiter**:

    - Provider-specific dedicated queues with improved timeouts (2 minutes default)
    - Per-provider concurrency limits with optimized DeepSeek settings (RPM: 60, Concurrency: 5)
    - Automatic rate limiting based on API specifications
    - Intelligent queue prioritization (priority vs. FIFO)
    - Extended queue timeout protection to prevent request failures
    - Adaptive throttling with auto-adjustment based on response times and error rates

- **Advanced Caching**:

    - Stale-while-revalidate cache strategy
    - Background cache entry refresh
    - Hash-based caching for large texts
    - Performance metrics tracking
    - Optimized TTL management

- **Parallel Processing**:

    - Multi-threaded language processing
    - Provider-specific concurrent operation limits
    - Hardware-aware auto-optimization
    - Dynamic batching for optimal throughput
    - Request prioritization (shorter texts prioritized)

- **Asynchronous File Operations**:

    - Modernized file operations with promises
    - Atomic file write operations with temp files
    - Error-resilient directory creation
    - Parallel language batch processing
    - Automatic file backups
    - Configurable JSON formatting

- **Adaptive Provider Management**:
    - Intelligent provider selection based on success rates
    - Automatic provider disabling after multiple failures
    - Self-healing system with timed re-enabling
    - Success-rate ordered provider chain
    - Enhanced API key validation and error handling

### Context Detection System

- **AI-Powered Analysis**: Uses OpenAI (gpt-4o) for intelligent context detection
- **Weighted Category Matching**: Keyword-based fast matching with confidence scoring
- **Confidence-based Selection**: Automatic fallback to keyword matching for low-confidence results
- **Debug Mode**: Detailed analysis information for troubleshooting
- **Category-specific Prompts**: Customized translation instructions per context
- **Dynamic Category Suggestion**: AI can suggest new categories (allowNewCategories option)
- **Minimum Text Length Threshold**: Efficient processing with configurable text length limits
- **Hybrid Approach**: Fast keyword matching + AI analysis for optimal performance

### Quality Control

- Placeholder validation
- HTML tag preservation
- Punctuation checking
- Length control
- Output sanitization
- Markdown formatting preservation
- AI artifacts cleanup
- Special character normalization
- Consistent whitespace handling
- Code block preservation
- Automatic issue fixing

### Length Control Modes

| Mode     | Tolerance | Description                                     |
| -------- | --------- | ----------------------------------------------- |
| strict   | 0.1       | Max 10% longer than source                      |
| flexible | 0.3       | Max 30% longer than source                      |
| exact    | 0.05      | Near exact length match (±5%)                   |
| relaxed  | 0.5       | Max 50% longer for special cases                |
| smart    | -         | Combines language and context rules dynamically |

**Smart Mode Features:**

- Language-specific length rules (e.g. Japanese: 35% max)
- Context-aware adjustments (technical: 20% vs marketing: 30%)
- Automatic brevity optimization
- Priority to semantic accuracy over strict length

### Error Handling and Reliability

- Provider-specific error messages
- Automatic fallback system
- Progress preservation
- Enhanced retry mechanism:
    - Exponential backoff with jitter
    - Error-type based retry decisions
    - Customizable retry parameters
    - Smart error categorization
- Improved diagnostics with verbose mode
- Detailed error logging and reporting
- Request timeouts with configurable duration

### System Settings and Diagnostics

- Verbose mode for detailed logging
- Configurable log rotation
- Performance monitoring
- Hardware utilization stats
- File backups
- Automatic system capacity detection
- Request and response tracking

### Real-time Progress

```plaintext
[tr] [==========          ] 50.0% | 250/500 items | ✅ 240 | ❌ 10 | ⏱️ 25.3s ETA: 1m 15s

📊 Translation Summary:
🔤 Language: tr
🔢 Total Items: 500
✅ Successful: 450 (90.0%)
❌ Failed: 50
⏱️ Total Time: 52.40s
⚡ Average Speed: 9.54 items/second
📏 Average Time per Item: 104ms

🌍 Global Translation Summary:
Languages Processed: 3
Total Translations: 1340
✅ Success: 1256
❌ Failed: 84
⏭️ Skipped: 160
⏳ Total Time: 168.5s
⚡ Average per language: 56.2s

📊 Per-language Performance:
tr: 450 added, 110 skipped, 50 failed (53.4s)
es: 435 added, 50 skipped, 15 failed (47.2s)
de: 371 added, 0 skipped, 19 failed (68.1s)

📊 Context Analysis by Category:
technical: 526 items (85.5% avg confidence)
defi: 364 items (78.2% avg confidence)
marketing: 218 items (81.7% avg confidence)
general: 232 items
```

## 📜 License

ISC License - Developed by [Schwifty](https://github.com/ahmetenesdur)
