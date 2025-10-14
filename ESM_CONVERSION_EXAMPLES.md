# 🔄 ESM Conversion Examples - Practical Guide

This document provides **exact before/after examples** for converting your specific files from CommonJS to ESM.

---

## 📦 1. Simple Utility Class (input-validator.js)

### BEFORE (CommonJS):
```javascript
const path = require("path");

class InputValidator {
    static LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/;
    
    static validateLanguageCode(langCode, paramName = "language") {
        // ... implementation
    }
}

module.exports = InputValidator;
```

### AFTER (ESM):
```javascript
import path from "path";

class InputValidator {
    static LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/;
    
    static validateLanguageCode(langCode, paramName = "language") {
        // ... implementation
    }
}

export default InputValidator;
```

**Changes:**
- `require("path")` → `import path from "path";`
- `module.exports =` → `export default`

---

## 🔧 2. Utility with Multiple Exports (file-manager.js)

### BEFORE (CommonJS):
```javascript
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

class FileManager {
    static async readJSON(filePath) {
        // ... implementation
    }
}

class SyncFileManager {
    static readJSON(filePath) {
        // ... implementation
    }
}

module.exports = { FileManager, SyncFileManager };
```

### AFTER (ESM):
```javascript
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

class FileManager {
    static async readJSON(filePath) {
        // ... implementation
    }
}

class SyncFileManager {
    static readJSON(filePath) {
        // ... implementation
    }
}

export { FileManager, SyncFileManager };
```

**Changes:**
- `require("fs").promises` → `import { promises as fs } from "fs";`
- `require("fs")` → `import fsSync from "fs";`
- `module.exports = { ... }` → `export { ... };`

---

## 🎯 3. Class with Singleton Pattern (rate-limiter.js)

### BEFORE (CommonJS):
```javascript
const { performance } = require("perf_hooks");

class RateLimiter {
    constructor(config = {}) {
        // ... implementation
    }
    
    async enqueue(provider, task) {
        // ... implementation
    }
}

const config = {
    queueStrategy: process.env.QUEUE_STRATEGY || "priority",
};

module.exports = new RateLimiter(config);
```

### AFTER (ESM):
```javascript
import { performance } from "perf_hooks";

class RateLimiter {
    constructor(config = {}) {
        // ... implementation
    }
    
    async enqueue(provider, task) {
        // ... implementation
    }
}

const config = {
    queueStrategy: process.env.QUEUE_STRATEGY || "priority",
};

export default new RateLimiter(config);
```

**Changes:**
- `require("perf_hooks")` → `import { performance } from "perf_hooks";`
- `module.exports =` → `export default`

---

## 🏭 4. Factory Pattern (provider-factory.js)

### BEFORE (CommonJS):
```javascript
const deepseekProvider = require("../providers/deepseek");
const geminiProvider = require("../providers/gemini");
const openaiProvider = require("../providers/openai");
const FallbackProvider = require("./fallback-provider");
const rateLimiter = require("../utils/rate-limiter");

class ProviderFactory {
    static getProvider(providerName, useFallback = true) {
        // ... implementation
    }
}

module.exports = ProviderFactory;
```

### AFTER (ESM):
```javascript
import deepseekProvider from "../providers/deepseek.js";
import geminiProvider from "../providers/gemini.js";
import openaiProvider from "../providers/openai.js";
import FallbackProvider from "./fallback-provider.js";
import rateLimiter from "../utils/rate-limiter.js";

class ProviderFactory {
    static getProvider(providerName, useFallback = true) {
        // ... implementation
    }
}

export default ProviderFactory;
```

**Changes:**
- All `require("../path")` → `import ... from "../path.js";`
- **CRITICAL:** Add `.js` extension to all relative imports!
- `module.exports =` → `export default`

---

## 🔌 5. Provider with Mixed Exports (openai.js)

### BEFORE (CommonJS):
```javascript
const axios = require("axios");
const BaseProvider = require("./base-provider");
const { getPrompt, getAnalysisPrompt } = require("../utils/prompt-templates");
const RetryHelper = require("../utils/retry-helper");

class OpenAIProvider extends BaseProvider {
    async translate(text, sourceLang, targetLang, options = {}) {
        // ... implementation
    }
}

const openaiProvider = new OpenAIProvider();

async function translate(text, sourceLang, targetLang, options) {
    return openaiProvider.translate(text, sourceLang, targetLang, options);
}

async function analyze(prompt, options = {}) {
    return openaiProvider.analyze(prompt, options);
}

module.exports = { translate, analyze, OpenAIProvider };
```

### AFTER (ESM):
```javascript
import axios from "axios";
import BaseProvider from "./base-provider.js";
import { getPrompt, getAnalysisPrompt } from "../utils/prompt-templates.js";
import RetryHelper from "../utils/retry-helper.js";

class OpenAIProvider extends BaseProvider {
    async translate(text, sourceLang, targetLang, options = {}) {
        // ... implementation
    }
}

const openaiProvider = new OpenAIProvider();

async function translate(text, sourceLang, targetLang, options) {
    return openaiProvider.translate(text, sourceLang, targetLang, options);
}

async function analyze(prompt, options = {}) {
    return openaiProvider.analyze(prompt, options);
}

export { translate, analyze, OpenAIProvider };
```

**Changes:**
- External packages: `require("axios")` → `import axios from "axios";`
- Named destructuring: `const { a, b } = require("...")` → `import { a, b } from "...";`
- Add `.js` to relative imports
- `module.exports = { ... }` → `export { ... };`

---

## 🎼 6. Orchestrator with Complex Dependencies (orchestrator.js)

### BEFORE (CommonJS):
```javascript
const rateLimiter = require("../utils/rate-limiter");
const ProviderFactory = require("./provider-factory");
const ProgressTracker = require("../utils/progress-tracker");
const QualityChecker = require("../utils/quality");
const ContextProcessor = require("./context-processor");
const { LRUCache } = require("lru-cache");
const crypto = require("crypto");
const gracefulShutdown = require("../utils/graceful-shutdown");

class Orchestrator {
    constructor(options) {
        this.options = options;
        // ... implementation
    }
}

module.exports = Orchestrator;
```

### AFTER (ESM):
```javascript
import rateLimiter from "../utils/rate-limiter.js";
import ProviderFactory from "./provider-factory.js";
import ProgressTracker from "../utils/progress-tracker.js";
import QualityChecker from "../utils/quality/index.js";
import ContextProcessor from "./context-processor.js";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import gracefulShutdown from "../utils/graceful-shutdown.js";

class Orchestrator {
    constructor(options) {
        this.options = options;
        // ... implementation
    }
}

export default Orchestrator;
```

**Changes:**
- Default imports from local files get `.js`
- Named imports from packages stay the same: `{ LRUCache } from "lru-cache"`
- Built-in modules: `require("crypto")` → `import crypto from "crypto";`

---

## 📝 7. Complex Command File (translator.js)

### BEFORE (CommonJS):
```javascript
const path = require("path");
const { FileManager } = require("../utils/file-manager");
const ObjectTransformer = require("../utils/object-transformer");
const Orchestrator = require("../core/orchestrator");
const QualityChecker = require("../utils/quality");
const StateManager = require("../utils/state-manager");
const InputValidator = require("../utils/input-validator");
const gracefulShutdown = require("../utils/graceful-shutdown");

async function translateFile(file, options) {
    // ... implementation
}

async function validateAndFixExistingTranslations(file, options) {
    // ... implementation
}

async function findLocaleFiles(localesDir, sourceLang) {
    // ... implementation
}

module.exports = {
    findLocaleFiles,
    translateFile,
    validateAndFixExistingTranslations,
};
```

### AFTER (ESM):
```javascript
import path from "path";
import { FileManager } from "../utils/file-manager.js";
import ObjectTransformer from "../utils/object-transformer.js";
import Orchestrator from "../core/orchestrator.js";
import QualityChecker from "../utils/quality/index.js";
import StateManager from "../utils/state-manager.js";
import InputValidator from "../utils/input-validator.js";
import gracefulShutdown from "../utils/graceful-shutdown.js";

async function translateFile(file, options) {
    // ... implementation
}

async function validateAndFixExistingTranslations(file, options) {
    // ... implementation
}

async function findLocaleFiles(localesDir, sourceLang) {
    // ... implementation
}

export {
    findLocaleFiles,
    translateFile,
    validateAndFixExistingTranslations,
};
```

**Changes:**
- Mix of default and named imports based on original module's export
- All relative imports get `.js` extension
- Export individual functions with `export { ... }`

---

## 🎯 8. Main Entry Point (bin/localize.js)

### BEFORE (CommonJS):
```javascript
#!/usr/bin/env node
require("dotenv").config({ path: [".env.local", ".env"] });
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const { program } = require("commander");
const {
    translateFile,
    findLocaleFiles,
    validateAndFixExistingTranslations,
} = require("../src/commands/translator");
const ProviderFactory = require("../src/core/provider-factory");

const loadConfig = async () => {
    // ... try require first
    const config = require(configFile);
    return config;
};

(async () => {
    await loadEnvironmentVariables();
    const defaultConfig = await loadConfig();
    await configureCLI(defaultConfig);
})();
```

### AFTER (ESM):
```javascript
#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import os from "os";
import { program } from "commander";
import {
    translateFile,
    findLocaleFiles,
    validateAndFixExistingTranslations,
} from "../src/commands/translator.js";
import ProviderFactory from "../src/core/provider-factory.js";

const loadConfig = async () => {
    // Use dynamic import for config files
    const configModule = await import(configFile);
    const config = configModule.default || configModule;
    return config;
};

// Top-level await is allowed in ESM
await loadEnvironmentVariables();
const defaultConfig = await loadConfig();
await configureCLI(defaultConfig);
```

**Changes:**
- `require("dotenv").config()` → `import dotenv from "dotenv"; dotenv.config();`
- `require("fs").promises` → `import { promises as fs } from "fs";`
- Dynamic config loading uses `import()` instead of `require()`
- **Top-level await** - no need for IIFE wrapper!
- Handle both default and named exports from config: `configModule.default || configModule`

---

## 📋 9. Config File (localize.config.js)

### BEFORE (CommonJS):
```javascript
module.exports = {
    version: "1.0.0",
    localesDir: "./locales",
    source: "en",
    targets: ["tr", "de", "es"],
    // ... rest of config
};
```

### AFTER (ESM):
```javascript
export default {
    version: "1.0.0",
    localesDir: "./locales",
    source: "en",
    targets: ["tr", "de", "es"],
    // ... rest of config
};
```

**Changes:**
- `module.exports =` → `export default`
- That's it! Config objects are the simplest to convert.

---

## 🔍 10. Context Processor (context-processor.js)

### BEFORE (CommonJS):
```javascript
const crypto = require("crypto");
const AIContextAnalyzer = require("../utils/ai-context-analyzer");
const ProviderFactory = require("./provider-factory");
const { LRUCache } = require("lru-cache");

class ContextProcessor {
    constructor(config) {
        this.config = config;
        this.resultCache = new LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 60 * 24,
        });
    }
}

module.exports = ContextProcessor;
```

### AFTER (ESM):
```javascript
import crypto from "crypto";
import AIContextAnalyzer from "../utils/ai-context-analyzer.js";
import ProviderFactory from "./provider-factory.js";
import { LRUCache } from "lru-cache";

class ContextProcessor {
    constructor(config) {
        this.config = config;
        this.resultCache = new LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 60 * 24,
        });
    }
}

export default ContextProcessor;
```

**Changes:**
- Built-in module: `require("crypto")` → `import crypto from "crypto";`
- Named import from package: `{ LRUCache } from "lru-cache"` stays the same
- Local imports get `.js` extensions

---

## 🧩 Pattern Recognition Guide

### Pattern: Default Import from Local File
```javascript
// CommonJS
const MyClass = require("./my-class");

// ESM
import MyClass from "./my-class.js";
```

### Pattern: Named Imports from Local File
```javascript
// CommonJS
const { funcA, funcB } = require("./utils");

// ESM
import { funcA, funcB } from "./utils.js";
```

### Pattern: Default Import from Package
```javascript
// CommonJS
const axios = require("axios");

// ESM
import axios from "axios";
```

### Pattern: Named Import from Package
```javascript
// CommonJS
const { program } = require("commander");

// ESM
import { program } from "commander";
```

### Pattern: Mixed Import (Destructuring)
```javascript
// CommonJS
const { promises: fs } = require("fs");

// ESM
import { promises as fs } from "fs";
```

### Pattern: Namespace Import
```javascript
// CommonJS
const path = require("path");

// ESM
import path from "path";
// OR
import * as path from "path";
```

### Pattern: Dynamic Import (async)
```javascript
// CommonJS
const module = require("./dynamic");

// ESM (top-level)
const module = await import("./dynamic.js");

// ESM (in function)
async function load() {
    const module = await import("./dynamic.js");
    return module.default || module;
}
```

---

## 🚨 Critical Differences to Remember

### 1. File Extensions
```javascript
// ❌ WRONG - ESM requires extensions
import MyClass from "./my-class";

// ✅ CORRECT
import MyClass from "./my-class.js";
```

### 2. Default vs Named Exports
```javascript
// If file exports: export default MyClass
import MyClass from "./file.js"; // ✅

// If file exports: export { MyClass }
import { MyClass } from "./file.js"; // ✅

// If file exports: export = new MyClass()
import instance from "./file.js"; // ✅
```

### 3. CommonJS Variables Not Available
```javascript
// ❌ NOT AVAILABLE in ESM
__dirname
__filename
require
module
exports

// ✅ ALTERNATIVES
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 4. Dynamic Imports are Async
```javascript
// CommonJS - synchronous
const config = require('./config.js');

// ESM - asynchronous
const config = await import('./config.js');
// Returns a module object, may need .default
const actualConfig = config.default || config;
```

### 5. JSON Imports
```javascript
// CommonJS
const data = require('./data.json');

// ESM (Node.js 17.5+)
import data from './data.json' assert { type: 'json' };

// ESM (Alternative)
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./data.json', 'utf-8'));
```

---

## 📝 Checklist for Each File Conversion

For each file you convert, verify:

- [ ] All `require()` statements converted to `import`
- [ ] All `module.exports` converted to `export`
- [ ] All relative imports have `.js` extension
- [ ] Mixed exports (default + named) properly handled
- [ ] No `__dirname` or `__filename` usage (or replaced)
- [ ] Dynamic imports use `await import()` syntax
- [ ] File runs without syntax errors: `node --check filename.js`

---

## 🎯 Quick Reference Table

| CommonJS | ESM | Notes |
|----------|-----|-------|
| `const x = require('pkg')` | `import x from 'pkg'` | Default import |
| `const { a } = require('pkg')` | `import { a } from 'pkg'` | Named import |
| `require('./file')` | `import from './file.js'` | **Add .js!** |
| `module.exports = X` | `export default X` | Default export |
| `module.exports = { a, b }` | `export { a, b }` | Named exports |
| `exports.a = val` | `export const a = val` | Individual export |
| `__dirname` | `dirname(fileURLToPath(import.meta.url))` | Need imports |
| `require.resolve()` | `import.meta.resolve()` | Node 20.6+ |

---

**Conversion Examples Version:** 1.0.0  
**Created:** 2025-10-14  
**Use with:** ESM_MIGRATION_PLAN.md
