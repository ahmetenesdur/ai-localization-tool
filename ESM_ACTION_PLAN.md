# 🎯 ESM Migration - Action Plan for ai-localization-tool

## ✅ Current Status (Based on Readiness Check)

**Readiness Score:** 35% - Caution, address warnings first

### ✅ What's Good
- ✅ Node.js v24.7.0 - Excellent ESM support
- ✅ All dependencies are ESM-compatible
- ✅ No `__dirname` or `__filename` usage
- ✅ No failed checks

### ⚠️ What Needs Attention
- ⚠️ Uncommitted changes exist
- ⚠️ Currently on main branch
- ⚠️ No backup created
- ⚠️ No automated tests

### 📊 Migration Scope
- **Files to convert:** 29 JavaScript files
- **require() statements:** 89
- **module.exports statements:** 28
- **Total conversions:** ~117

---

## 🚀 Immediate Action Steps (30 minutes)

### Step 1: Commit Current Work (5 min)
```bash
# Check what's uncommitted
git status

# Add and commit all changes
git add .
git commit -m "chore: prepare for ESM migration"
```

### Step 2: Create Feature Branch (2 min)
```bash
# Create and switch to migration branch
git checkout -b feat/esm-migration

# Tag the pre-migration state
git tag pre-esm-migration
```

### Step 3: Create Backup (3 min)
```bash
# Create timestamped backup
tar -czf ../ai-localization-tool-backup-$(date +%Y%m%d-%H%M%S).tar.gz .

# Verify backup was created
ls -lh ../ai-localization-tool-backup-*.tar.gz
```

### Step 4: Install Development Tools (5 min)
```bash
# Optional but recommended: Install madge for dependency checking
npm install -g madge

# Run dependency check
madge --circular --extensions js src/
```

### Step 5: Re-run Readiness Check (1 min)
```bash
./check-esm-readiness.sh
```

**Expected Result:** Should now show ~70-80% readiness with fewer warnings

---

## 📝 Detailed Migration Plan (4-6 hours)

### Phase 1: Package Configuration (15 minutes)

#### 1.1 Update package.json
Add these fields:

```json
{
  "type": "module",
  "exports": {
    ".": "./src/core/orchestrator.js",
    "./orchestrator": "./src/core/orchestrator.js",
    "./translator": "./src/commands/translator.js"
  },
  "engines": {
    "node": ">=14.13.0"
  }
}
```

**File:** `package.json`
**Command:** Edit manually or use this patch

#### 1.2 Test package.json validity
```bash
npm install --dry-run
```

---

### Phase 2: Convert Utilities (45 minutes)

**Order of conversion:**

1. `src/utils/input-validator.js` (5 min)
2. `src/utils/object-transformer.js` (5 min)
3. `src/utils/retry-helper.js` (5 min)
4. `src/utils/progress-tracker.js` (5 min)
5. `src/utils/graceful-shutdown.js` (5 min)
6. `src/utils/prompt-templates.js` (5 min)
7. `src/utils/state-manager.js` (5 min)
8. `src/utils/ai-context-analyzer.js` (5 min)
9. `src/utils/file-manager.js` (5 min)

**For each file:**
```bash
# 1. Open file
code src/utils/input-validator.js

# 2. Convert require → import
# 3. Convert module.exports → export
# 4. Add .js to relative imports

# 5. Check syntax
node --check src/utils/input-validator.js
```

---

### Phase 3: Convert Quality Checkers (30 minutes)

1. `src/utils/quality/base-checker.js`
2. `src/utils/quality/html-tag-checker.js`
3. `src/utils/quality/placeholder-checker.js`
4. `src/utils/quality/length-checker.js`
5. `src/utils/quality/punctuation-checker.js`
6. `src/utils/quality/text-sanitizer.js`
7. `src/utils/quality/index.js`

**Pattern to follow:** See ESM_CONVERSION_EXAMPLES.md

---

### Phase 4: Convert Providers (45 minutes)

**Order (base first, then implementations):**

1. `src/providers/base-provider.js` (10 min)
2. `src/providers/dashscope.js` (7 min)
3. `src/providers/deepseek.js` (7 min)
4. `src/providers/gemini.js` (7 min)
5. `src/providers/openai.js` (7 min)
6. `src/providers/xai.js` (7 min)

**Special attention:**
- Mixed exports (default + named)
- Singleton instances

---

### Phase 5: Convert Core (60 minutes)

**Order (dependencies first):**

1. `src/utils/rate-limiter.js` (15 min) - Singleton pattern
2. `src/core/context-processor.js` (10 min)
3. `src/core/fallback-provider.js` (10 min)
4. `src/core/provider-factory.js` (15 min) - Many dependencies
5. `src/core/orchestrator.js` (10 min) - Complex dependencies

**Test after this phase:**
```bash
# Syntax check all core files
find src/core -name "*.js" -exec node --check {} \;
```

---

### Phase 6: Convert Commands (20 minutes)

1. `src/commands/translator.js` (20 min) - Large file, many dependencies

**Critical checks:**
- All utility imports updated
- All core imports updated
- Export pattern correct

---

### Phase 7: Convert Entry Point (30 minutes)

1. `bin/localize.js` (30 min) - Most complex file

**Special handling needed:**
- Dynamic config imports
- Top-level await
- Dotenv configuration

**Template for bin/localize.js:**
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
// ... other imports with .js extensions

// Use top-level await for config loading
const loadConfig = async () => {
    const configModule = await import(configFile);
    return configModule.default || configModule;
};

// Top-level await (no IIFE needed!)
const config = await loadConfig();
await configureCLI(config);
```

---

### Phase 8: Convert Config (5 minutes)

1. `localize.config.js` (5 min) - Simple conversion

```javascript
// Just change:
// module.exports = { ... }
// to:
export default { ... };
```

---

### Phase 9: Testing (90 minutes)

#### 9.1 Syntax Validation (10 min)
```bash
# Check all files
find src bin -name "*.js" -exec node --check {} \;

# Look for missing .js extensions
grep -r "from ['\"]\\./[^'\"]*[^.js]['\"]" src/ bin/
```

#### 9.2 Basic Functionality Tests (20 min)
```bash
# 1. Help command
node bin/localize.js --help

# 2. Version
node bin/localize.js --version

# 3. List options
node bin/localize.js translate --help
```

#### 9.3 Translation Tests (30 min)
```bash
# Test with single language
node bin/localize.js translate --source en --targets tr

# Test with multiple languages
node bin/localize.js translate --source en --targets tr,de

# Test with specific provider
node bin/localize.js translate --provider openai

# Test with debug mode
node bin/localize.js translate --debug
```

#### 9.4 Advanced Feature Tests (20 min)
```bash
# Test AI context
node bin/localize.js advanced --use-ai

# Test fix command
node bin/localize.js fix

# Test analyze
node bin/localize.js analyze
```

#### 9.5 Error Handling Tests (10 min)
```bash
# Test with invalid options
node bin/localize.js translate --invalid-option

# Test with missing config
mv localize.config.js localize.config.bak
node bin/localize.js translate
mv localize.config.bak localize.config.js
```

---

## 🧪 Testing Checklist

After migration, verify each item:

### Core Functionality
- [ ] `node bin/localize.js --help` works
- [ ] `node bin/localize.js --version` works
- [ ] Translation command runs without errors
- [ ] Fix command works
- [ ] Analyze command works
- [ ] Advanced command works

### Providers
- [ ] OpenAI provider works (if API key set)
- [ ] DeepSeek provider works (if API key set)
- [ ] Gemini provider works (if API key set)
- [ ] Dashscope provider works (if API key set)
- [ ] xAI provider works (if API key set)
- [ ] Fallback chain works

### File Operations
- [ ] Source file reading works
- [ ] Target file writing works
- [ ] Backup creation works
- [ ] Config file loading works

### Features
- [ ] Caching works correctly
- [ ] Rate limiting functions
- [ ] Context analysis works
- [ ] Quality checks run
- [ ] Progress tracking displays
- [ ] Error handling preserved

### Performance
- [ ] No memory leaks
- [ ] Response times similar to before
- [ ] Cache hit rates maintained

---

## 📊 Migration Tracking

### Progress Tracker

Create this file to track your progress: `migration-progress.md`

```markdown
# ESM Migration Progress

## Phase 1: Package Config ⬜
- [ ] Update package.json
- [ ] Test validity

## Phase 2: Utilities (9 files) ⬜
- [ ] input-validator.js
- [ ] object-transformer.js
- [ ] retry-helper.js
- [ ] progress-tracker.js
- [ ] graceful-shutdown.js
- [ ] prompt-templates.js
- [ ] state-manager.js
- [ ] ai-context-analyzer.js
- [ ] file-manager.js

## Phase 3: Quality Checkers (7 files) ⬜
- [ ] base-checker.js
- [ ] html-tag-checker.js
- [ ] placeholder-checker.js
- [ ] length-checker.js
- [ ] punctuation-checker.js
- [ ] text-sanitizer.js
- [ ] index.js

## Phase 4: Providers (6 files) ⬜
- [ ] base-provider.js
- [ ] dashscope.js
- [ ] deepseek.js
- [ ] gemini.js
- [ ] openai.js
- [ ] xai.js

## Phase 5: Core (5 files) ⬜
- [ ] rate-limiter.js
- [ ] context-processor.js
- [ ] fallback-provider.js
- [ ] provider-factory.js
- [ ] orchestrator.js

## Phase 6: Commands (1 file) ⬜
- [ ] translator.js

## Phase 7: Entry Point (1 file) ⬜
- [ ] bin/localize.js

## Phase 8: Config (1 file) ⬜
- [ ] localize.config.js

## Phase 9: Testing ⬜
- [ ] Syntax validation
- [ ] Basic functionality
- [ ] Translation tests
- [ ] Advanced features
- [ ] Error handling
```

---

## 🚨 Common Issues & Quick Fixes

### Issue 1: "Cannot find module './file'"
**Cause:** Missing `.js` extension
**Fix:**
```bash
# Find all imports without .js in relative paths
grep -r "from ['\"]\\./.*[^.js]['\"]" src/

# Add .js to each one
```

### Issue 2: "exports is not defined"
**Cause:** Still using CommonJS syntax
**Fix:** Convert to `export` syntax

### Issue 3: "require is not defined"
**Cause:** Still using CommonJS syntax
**Fix:** Convert to `import` syntax

### Issue 4: Config import returns undefined
**Cause:** Not handling default export correctly
**Fix:**
```javascript
const configModule = await import('./config.js');
const config = configModule.default || configModule;
```

### Issue 5: Circular dependency error
**Cause:** ESM is stricter about circular deps
**Fix:** Refactor to break the circle or use dynamic import

---

## ✅ Final Validation

Before considering migration complete:

```bash
# 1. All syntax valid
find src bin -name "*.js" -exec node --check {} \; && echo "✅ All files valid"

# 2. No require() left
! grep -r "require(" src/ bin/ && echo "✅ No require() found"

# 3. No module.exports left
! grep -r "module.exports" src/ bin/ && echo "✅ No module.exports found"

# 4. All relative imports have .js
! grep -r "from ['\"]\\./[^'\"]*[^.js]['\"]" src/ bin/ && echo "✅ All imports have .js"

# 5. Run basic test
node bin/localize.js --help && echo "✅ CLI works"
```

---

## 🎯 Success Metrics

Migration is successful when:

1. ✅ All 29 files converted to ESM
2. ✅ Package.json has `"type": "module"`
3. ✅ All tests pass
4. ✅ No runtime errors
5. ✅ Performance maintained
6. ✅ All CLI commands work
7. ✅ All providers functional

---

## 📅 Recommended Timeline

| Time | Activity | Duration |
|------|----------|----------|
| 09:00 | Preparation (commit, branch, backup) | 30 min |
| 09:30 | Phase 1: Package config | 15 min |
| 09:45 | Phase 2: Utilities | 45 min |
| 10:30 | Break | 15 min |
| 10:45 | Phase 3: Quality checkers | 30 min |
| 11:15 | Phase 4: Providers | 45 min |
| 12:00 | Lunch | 60 min |
| 13:00 | Phase 5: Core | 60 min |
| 14:00 | Phase 6: Commands | 20 min |
| 14:20 | Phase 7: Entry point | 30 min |
| 14:50 | Phase 8: Config | 5 min |
| 14:55 | Break | 15 min |
| 15:10 | Phase 9: Testing | 90 min |
| 16:40 | Final validation & cleanup | 20 min |
| 17:00 | Done! | |

**Total:** ~5 hours (including breaks)

---

## 🎬 Getting Started

**Right now, run these commands:**

```bash
# 1. Commit current work
git add .
git commit -m "chore: prepare for ESM migration"

# 2. Create branch
git checkout -b feat/esm-migration
git tag pre-esm-migration

# 3. Create backup
tar -czf ../ai-localization-tool-backup-$(date +%Y%m%d-%H%M%S).tar.gz .

# 4. Verify backup
ls -lh ../ai-localization-tool-backup-*.tar.gz

# 5. Re-check readiness
./check-esm-readiness.sh

# 6. Start migration!
# Follow ESM_MIGRATION_PLAN.md and use ESM_CONVERSION_EXAMPLES.md as reference
```

---

**You're ready!** Start with Phase 1 and work through systematically. Good luck! 🚀

**Questions?** Check:
- [ESM_MIGRATION_PLAN.md](./ESM_MIGRATION_PLAN.md) - Detailed strategy
- [ESM_CONVERSION_EXAMPLES.md](./ESM_CONVERSION_EXAMPLES.md) - Code patterns
- [ESM_MIGRATION_SUMMARY.md](./ESM_MIGRATION_SUMMARY.md) - Quick reference

---

**Last Updated:** 2025-10-14  
**Status:** Ready to start
**Estimated Completion:** 1 day
