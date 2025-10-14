# ⚡ ESM Quick Reference Card

**Print this page or keep it open during migration!**

---

## 🔄 Basic Conversion Patterns

### Imports

| CommonJS | ESM |
|----------|-----|
| `const x = require('pkg')` | `import x from 'pkg'` |
| `const { a, b } = require('pkg')` | `import { a, b } from 'pkg'` |
| `const path = require('path')` | `import path from 'path'` |
| `const fs = require('fs').promises` | `import { promises as fs } from 'fs'` |
| `const X = require('./file')` | `import X from './file.js'` ⚠️ |
| `const { a } = require('./utils')` | `import { a } from './utils.js'` ⚠️ |

⚠️ **Critical:** Always add `.js` extension for relative imports!

### Exports

| CommonJS | ESM |
|----------|-----|
| `module.exports = X` | `export default X` |
| `module.exports = { a, b }` | `export { a, b }` |
| `exports.a = value` | `export const a = value` |
| `module.exports = Class; module.exports.helper = fn` | `export default Class; export { fn as helper }` |

---

## 📦 Package-Specific Patterns

### Node.js Built-ins

```javascript
// Before
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// After
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
```

### External Packages (Your Project)

```javascript
// Before
const axios = require('axios');
const { program } = require('commander');
const dotenv = require('dotenv');
const { LRUCache } = require('lru-cache');

// After
import axios from 'axios';
import { program } from 'commander';
import dotenv from 'dotenv';
import { LRUCache } from 'lru-cache';
```

### Internal Modules

```javascript
// Before
const FileManager = require('../utils/file-manager');
const { FileManager } = require('../utils/file-manager');

// After
import FileManager from '../utils/file-manager.js';
import { FileManager } from '../utils/file-manager.js';
```

---

## ⚡ Common Patterns in Your Codebase

### Pattern 1: Simple Class Export
```javascript
// BEFORE: src/utils/input-validator.js
const path = require("path");
class InputValidator { }
module.exports = InputValidator;

// AFTER
import path from "path";
class InputValidator { }
export default InputValidator;
```

### Pattern 2: Multiple Named Exports
```javascript
// BEFORE: src/utils/file-manager.js
class FileManager { }
class SyncFileManager { }
module.exports = { FileManager, SyncFileManager };

// AFTER
class FileManager { }
class SyncFileManager { }
export { FileManager, SyncFileManager };
```

### Pattern 3: Singleton Instance
```javascript
// BEFORE: src/utils/rate-limiter.js
class RateLimiter { }
const instance = new RateLimiter(config);
module.exports = instance;

// AFTER
class RateLimiter { }
const instance = new RateLimiter(config);
export default instance;
```

### Pattern 4: Mixed Exports (Provider Pattern)
```javascript
// BEFORE: src/providers/openai.js
class OpenAIProvider { }
const instance = new OpenAIProvider();
async function translate() { }
module.exports = { translate, OpenAIProvider };

// AFTER
class OpenAIProvider { }
const instance = new OpenAIProvider();
async function translate() { }
export { translate, OpenAIProvider };
```

### Pattern 5: Factory Pattern
```javascript
// BEFORE: src/core/provider-factory.js
const provider1 = require('../providers/provider1');
const provider2 = require('../providers/provider2');
class Factory { }
module.exports = Factory;

// AFTER
import provider1 from '../providers/provider1.js';
import provider2 from '../providers/provider2.js';
class Factory { }
export default Factory;
```

---

## 🚨 Critical Rules

### ✅ DO
- ✅ Add `.js` to ALL relative imports
- ✅ Use `import` for all modules
- ✅ Use `export` for all exports
- ✅ Check syntax after each file: `node --check file.js`
- ✅ Test incrementally

### ❌ DON'T
- ❌ Forget `.js` extension on relative imports
- ❌ Mix `require()` and `import` in same file
- ❌ Use `module.exports` in ESM
- ❌ Use `__dirname` or `__filename` without replacement
- ❌ Skip testing

---

## 🎯 File-by-File Checklist

For EACH file you convert:

```bash
# 1. Open file
code src/path/to/file.js

# 2. Convert all require() → import
#    - External: import pkg from 'pkg'
#    - Local: import X from './file.js' (ADD .js!)

# 3. Convert module.exports → export
#    - Default: export default X
#    - Named: export { a, b }

# 4. Save file

# 5. Check syntax
node --check src/path/to/file.js

# 6. If OK, continue. If error, fix and repeat step 5
```

---

## 🧪 Quick Test Commands

```bash
# Check syntax of one file
node --check src/core/orchestrator.js

# Check all files
find src bin -name "*.js" -exec node --check {} \;

# Find missing .js extensions
grep -r "from ['\"]\\./[^'\"]*[^.js]['\"]" src/ bin/

# Find leftover require()
grep -r "require(" src/ bin/

# Find leftover module.exports
grep -r "module.exports" src/ bin/

# Test CLI still works
node bin/localize.js --help

# Test translation
node bin/localize.js translate --source en --targets tr
```

---

## 🔍 Debugging Tips

### Error: "Cannot find module './file'"
**Solution:** Add `.js` extension
```javascript
// Wrong
import X from './file';

// Correct
import X from './file.js';
```

### Error: "exports is not defined"
**Solution:** Change to export syntax
```javascript
// Wrong
module.exports = X;

// Correct
export default X;
```

### Error: "require is not defined"
**Solution:** Change to import syntax
```javascript
// Wrong
const X = require('./file');

// Correct
import X from './file.js';
```

### Error: Config import returns undefined
**Solution:** Handle default export
```javascript
const configModule = await import('./config.js');
const config = configModule.default || configModule;
```

---

## 📊 Progress Tracking

```
Utilities (9):      ⬜⬜⬜⬜⬜⬜⬜⬜⬜
Quality (7):        ⬜⬜⬜⬜⬜⬜⬜
Providers (6):      ⬜⬜⬜⬜⬜⬜
Core (5):           ⬜⬜⬜⬜⬜
Commands (1):       ⬜
Entry (1):          ⬜
Config (1):         ⬜

Total: 0/30 files converted
```

**Mark each ⬜ as ✅ when done!**

---

## ⚡ Speed Tips

### 1. Use Find & Replace (VS Code)
**Find:** `const (.*) = require\((['"])(.*)(['"])\)`  
**Replace:** `import $1 from $2$3$4`

**Find:** `module\.exports = `  
**Replace:** `export default `

### 2. Multi-cursor Editing
Select all `require(` → Edit simultaneously

### 3. Keyboard Shortcuts
- `Cmd+D` - Select next occurrence
- `Cmd+Shift+L` - Select all occurrences
- `Cmd+/` - Toggle comment

---

## 📁 File Conversion Order (Copy/Paste into terminal)

```bash
# Phase 2: Utilities
code src/utils/input-validator.js
code src/utils/object-transformer.js
code src/utils/retry-helper.js
code src/utils/progress-tracker.js
code src/utils/graceful-shutdown.js
code src/utils/prompt-templates.js
code src/utils/state-manager.js
code src/utils/ai-context-analyzer.js
code src/utils/file-manager.js

# Phase 3: Quality
code src/utils/quality/base-checker.js
code src/utils/quality/html-tag-checker.js
code src/utils/quality/placeholder-checker.js
code src/utils/quality/length-checker.js
code src/utils/quality/punctuation-checker.js
code src/utils/quality/text-sanitizer.js
code src/utils/quality/index.js

# Phase 4: Providers
code src/providers/base-provider.js
code src/providers/dashscope.js
code src/providers/deepseek.js
code src/providers/gemini.js
code src/providers/openai.js
code src/providers/xai.js

# Phase 5: Core
code src/utils/rate-limiter.js
code src/core/context-processor.js
code src/core/fallback-provider.js
code src/core/provider-factory.js
code src/core/orchestrator.js

# Phase 6: Commands
code src/commands/translator.js

# Phase 7: Entry
code bin/localize.js

# Phase 8: Config
code localize.config.js
```

---

## 🎯 Final Checks

Before committing:

```bash
# 1. Syntax check
find src bin -name "*.js" -exec node --check {} \; || echo "❌ Syntax errors found"

# 2. No require left
! grep -rn "require(" src/ bin/ || echo "❌ require() still exists"

# 3. No module.exports left
! grep -rn "module.exports" src/ bin/ || echo "❌ module.exports still exists"

# 4. All .js extensions present
! grep -rn "from ['\"]\\./[^'\"]*[^.js]['\"]" src/ bin/ || echo "❌ Missing .js extensions"

# 5. CLI works
node bin/localize.js --help || echo "❌ CLI broken"

# 6. Translation works
node bin/localize.js translate --source en --targets tr || echo "❌ Translation broken"
```

---

## 📞 Emergency Rollback

If something goes wrong:

```bash
# Quick rollback
git reset --hard pre-esm-migration
git tag -d post-esm-migration

# Or restore from backup
cd ..
tar -xzf ai-localization-tool-backup-*.tar.gz
```

---

**Keep this page open while working!** 🚀

**More details:** See [ESM_MIGRATION_PLAN.md](./ESM_MIGRATION_PLAN.md)  
**Code examples:** See [ESM_CONVERSION_EXAMPLES.md](./ESM_CONVERSION_EXAMPLES.md)  
**Action plan:** See [ESM_ACTION_PLAN.md](./ESM_ACTION_PLAN.md)
