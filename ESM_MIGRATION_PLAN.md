# 🚀 ESM Migration Plan - AI Localization Tool

## 📊 Executive Summary

**Current State:** CommonJS (require/module.exports)  
**Target State:** ES Modules (import/export)  
**Total Files:** 25 JavaScript files  
**Estimated Effort:** 4-6 hours  
**Risk Level:** Medium (requires testing all functionality)

---

## 🎯 Migration Benefits

### Performance & Tooling
- ✅ **Tree-shaking** - Smaller bundle sizes (20-40% reduction possible)
- ✅ **Better static analysis** - Improved IDE intellisense and type inference
- ✅ **Faster module resolution** - Modern bundlers optimize ESM better
- ✅ **Top-level await** - Simplify async initialization code

### Developer Experience
- ✅ **Named imports** - More explicit dependencies
- ✅ **Live bindings** - Better hot module replacement
- ✅ **Future-proof** - Aligns with JavaScript ecosystem direction
- ✅ **Better error messages** - Compile-time detection of issues

### Ecosystem Alignment
- ✅ **Modern packages** - Many new packages are ESM-only
- ✅ **Standards compliance** - Official ECMAScript standard
- ✅ **Framework compatibility** - Better support for Vite, Rollup, esbuild

---

## 📋 Pre-Migration Checklist

### Dependencies Analysis
```bash
# Check all dependencies support ESM
npm ls --all --parseable | grep node_modules | sort -u

# Current dependencies (all ESM-compatible):
✅ axios@1.12.2 - Full ESM support
✅ commander@14.0.1 - Full ESM support
✅ dotenv@17.2.3 - Full ESM support
✅ lru-cache@11.2.2 - ESM-only (v10+)
```

### Node.js Version Requirements
```bash
# Minimum: Node.js 14.13.0+ (ESM stable)
# Recommended: Node.js 18+ (better ESM support)
# Verify current version:
node --version
```

### Backup Strategy
```bash
# Create migration branch
git checkout -b feat/esm-migration

# Tag current state
git tag pre-esm-migration

# Create backup
tar -czf ../ai-localization-tool-backup-$(date +%Y%m%d).tar.gz .
```

---

## 🔄 Migration Steps

### Phase 1: Package Configuration (15 minutes)

#### 1.1 Update package.json
```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/core/orchestrator.js",
      "types": "./types/index.d.ts"
    },
    "./orchestrator": "./src/core/orchestrator.js",
    "./translator": "./src/commands/translator.js",
    "./providers/*": "./src/providers/*.js"
  },
  "engines": {
    "node": ">=14.13.0"
  }
}
```

#### 1.2 Rename Config File
```bash
# ESM doesn't support .js config without "type": "module"
mv localize.config.js localize.config.mjs
# OR keep .js if package.json has "type": "module"
```

---

### Phase 2: Core Module Conversions (90 minutes)

#### 2.1 Import Patterns Conversion

**CommonJS Pattern:**
```javascript
const fs = require("fs").promises;
const path = require("path");
const { FileManager } = require("../utils/file-manager");
```

**ESM Pattern:**
```javascript
import { promises as fs } from "fs";
import path from "path";
import { FileManager } from "../utils/file-manager.js";
```

**Key Differences:**
- ✅ Must include `.js` extension in relative imports
- ✅ Use destructuring with `import { ... } from`
- ✅ Default imports: `import name from 'module'`
- ✅ Named imports: `import { name } from 'module'`

#### 2.2 Export Patterns Conversion

**CommonJS Pattern:**
```javascript
module.exports = ClassName;
// OR
module.exports = { functionName, ClassName };
```

**ESM Pattern:**
```javascript
export default ClassName;
// OR
export { functionName, ClassName };
// OR inline
export class ClassName { }
export function functionName() { }
```

#### 2.3 Special Node.js Globals

**Problem:** `__dirname` and `__filename` don't exist in ESM

**Solution:**
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Note:** You don't currently use these, so no changes needed! ✅

---

### Phase 3: File-by-File Migration (120 minutes)

#### Priority Order (Dependencies First):

1. **Utilities (no dependencies):**
   - ✅ src/utils/input-validator.js
   - ✅ src/utils/object-transformer.js
   - ✅ src/utils/retry-helper.js
   - ✅ src/utils/progress-tracker.js
   - ✅ src/utils/graceful-shutdown.js
   - ✅ src/utils/prompt-templates.js

2. **Quality Checkers:**
   - ✅ src/utils/quality/base-checker.js
   - ✅ src/utils/quality/html-tag-checker.js
   - ✅ src/utils/quality/placeholder-checker.js
   - ✅ src/utils/quality/length-checker.js
   - ✅ src/utils/quality/punctuation-checker.js
   - ✅ src/utils/quality/text-sanitizer.js
   - ✅ src/utils/quality/index.js

3. **Advanced Utilities:**
   - ✅ src/utils/file-manager.js
   - ✅ src/utils/rate-limiter.js
   - ✅ src/utils/state-manager.js
   - ✅ src/utils/ai-context-analyzer.js

4. **Providers:**
   - ✅ src/providers/base-provider.js
   - ✅ src/providers/dashscope.js
   - ✅ src/providers/deepseek.js
   - ✅ src/providers/gemini.js
   - ✅ src/providers/openai.js
   - ✅ src/providers/xai.js

5. **Core:**
   - ✅ src/core/context-processor.js
   - ✅ src/core/fallback-provider.js
   - ✅ src/core/provider-factory.js
   - ✅ src/core/orchestrator.js

6. **Commands:**
   - ✅ src/commands/translator.js

7. **Entry Point:**
   - ✅ bin/localize.js (Keep shebang, add .mjs or use "type": "module")

---

### Phase 4: Special Cases (30 minutes)

#### 4.1 Dynamic Imports for Config Loading

**Current (bin/localize.js):**
```javascript
const config = require(configFile);
```

**ESM Solution:**
```javascript
const config = await import(configFile);
// Note: config might be in .default if it's a default export
const actualConfig = config.default || config;
```

#### 4.2 Singleton Exports Pattern

**Current (rate-limiter.js):**
```javascript
const rateLimiter = new RateLimiter(config);
module.exports = rateLimiter;
```

**ESM Solution:**
```javascript
const rateLimiter = new RateLimiter(config);
export default rateLimiter;
```

#### 4.3 Mixed Export Patterns

**Current (openai.js):**
```javascript
module.exports = { translate, analyze, OpenAIProvider };
```

**ESM Solution:**
```javascript
export { translate, analyze, OpenAIProvider };
// OR with default
export default { translate, analyze, OpenAIProvider };
export { translate, analyze, OpenAIProvider };
```

#### 4.4 Binary File (bin/localize.js)

**Option A: Keep .js with package.json type:module**
```javascript
#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: [".env.local", ".env"] });
// ... rest of code
```

**Option B: Rename to .mjs**
```javascript
#!/usr/bin/env node
// Works without "type": "module" in package.json
```

---

### Phase 5: Testing Strategy (45 minutes)

#### 5.1 Unit Testing Checklist
```bash
# Test basic functionality
node bin/localize.js --help

# Test translation
node bin/localize.js translate --source en --targets tr

# Test providers
node bin/localize.js translate --provider openai

# Test advanced features
node bin/localize.js advanced --use-ai

# Test fix command
node bin/localize.js fix

# Test with different configs
node bin/localize.js --debug
```

#### 5.2 Verify All Imports
```bash
# Check for syntax errors
find src -name "*.js" -exec node --check {} \;

# Check for missing .js extensions (common ESM issue)
grep -r "from ['\"]\\." src/ | grep -v "\\.js['\"]"
```

#### 5.3 Integration Tests
- ✅ Test all CLI commands
- ✅ Test all API providers
- ✅ Test file operations (read/write)
- ✅ Test caching mechanisms
- ✅ Test error handling
- ✅ Test graceful shutdown
- ✅ Test rate limiting

---

## 🔧 Common Pitfalls & Solutions

### Issue 1: Missing File Extensions
**Error:** `Cannot find module './file'`
**Solution:** Add `.js` extension: `import from './file.js'`

### Issue 2: Default vs Named Exports
**Error:** `undefined is not a function`
**Solution:** Check if using `export default` or `export { name }`
```javascript
// If: export default Class
import Class from './file.js';

// If: export { Class }
import { Class } from './file.js';

// If: export = new Class()
import instance from './file.js';
```

### Issue 3: Circular Dependencies
**Error:** Module loading hangs or throws
**Solution:** Refactor to break circles or use dynamic imports
```javascript
// Instead of:
import { heavy } from './circular.js';

// Use:
const { heavy } = await import('./circular.js');
```

### Issue 4: JSON Imports
**Error:** Cannot import JSON
**Solution:** Use import assertions
```javascript
// Old way doesn't work in ESM:
const data = require('./data.json');

// ESM way (Node 17.5+):
import data from './data.json' assert { type: 'json' };

// OR read as file:
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./data.json', 'utf-8'));
```

### Issue 5: require.resolve()
**Error:** require is not defined
**Solution:** Use import.meta.resolve() (Node 20.6+)
```javascript
// CommonJS:
const path = require.resolve('./module');

// ESM:
const path = await import.meta.resolve('./module');
```

---

## 📝 Migration Conversion Reference

### Pattern 1: Simple Default Export
```javascript
// BEFORE (CommonJS)
class MyClass { }
module.exports = MyClass;

// AFTER (ESM)
export default class MyClass { }
```

### Pattern 2: Multiple Named Exports
```javascript
// BEFORE (CommonJS)
function funcA() { }
function funcB() { }
module.exports = { funcA, funcB };

// AFTER (ESM)
export function funcA() { }
export function funcB() { }
```

### Pattern 3: Mixed Exports
```javascript
// BEFORE (CommonJS)
class Main { }
function helper() { }
module.exports = Main;
module.exports.helper = helper;

// AFTER (ESM)
export default class Main { }
export function helper() { }
```

### Pattern 4: Re-exports
```javascript
// BEFORE (CommonJS)
module.exports = {
  ...require('./moduleA'),
  ...require('./moduleB')
};

// AFTER (ESM)
export * from './moduleA.js';
export * from './moduleB.js';
```

### Pattern 5: Conditional Imports
```javascript
// BEFORE (CommonJS)
const module = isDev ? require('./dev') : require('./prod');

// AFTER (ESM)
const module = isDev 
  ? await import('./dev.js')
  : await import('./prod.js');
```

### Pattern 6: Built-in Modules
```javascript
// BEFORE (CommonJS)
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const path = require('path');

// AFTER (ESM)
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
```

### Pattern 7: External Packages
```javascript
// BEFORE (CommonJS)
const axios = require('axios');
const { program } = require('commander');

// AFTER (ESM)
import axios from 'axios';
import { program } from 'commander';
```

---

## 🎯 Recommended Migration Strategy

### Option A: Big Bang Migration (Recommended)
**Pros:** Clean, complete, no mixed module system  
**Cons:** Higher initial risk, requires thorough testing  
**Timeline:** 1 day with testing

**Steps:**
1. Create feature branch
2. Update package.json
3. Convert all files at once
4. Run comprehensive tests
5. Fix issues
6. Merge when all tests pass

### Option B: Gradual Migration
**Pros:** Lower risk, incremental testing  
**Cons:** Complex, mixed module systems, longer timeline  
**Timeline:** 3-5 days

**Steps:**
1. Keep package.json without "type": "module"
2. Rename files to .mjs as you convert
3. Update imports in converted files
4. Test each module independently
5. Once all converted, update package.json
6. Rename .mjs back to .js

**Recommendation:** Use Option A (Big Bang) because:
- Your codebase is well-structured
- No external dependents
- Clear module boundaries
- Easier to test holistically

---

## 🧪 Post-Migration Validation

### Automated Checks
```bash
# Run all existing functionality
npm run start

# Check for ESM-specific issues
npm run format:check

# Manual test runs
node bin/localize.js translate --source en --targets tr,de
node bin/localize.js fix
node bin/localize.js --debug
```

### Manual Verification
- [ ] All CLI commands work
- [ ] All API providers functional
- [ ] File reading/writing works
- [ ] Caching works correctly
- [ ] Error handling preserved
- [ ] Graceful shutdown works
- [ ] Rate limiting functional
- [ ] Quality checks operational
- [ ] Context analysis works
- [ ] Progress tracking displays

### Performance Benchmarks
```bash
# Before migration
time node bin/localize.js translate --source en --targets tr

# After migration (should be similar or slightly faster)
time node bin/localize.js translate --source en --targets tr
```

---

## 📊 Risk Assessment

### High Risk Areas
1. **Dynamic config loading** - Test thoroughly
2. **Singleton patterns** - Verify state management
3. **Circular dependencies** - May need refactoring

### Medium Risk Areas
1. **Provider factory** - Multiple dynamic imports
2. **Rate limiter** - Shared state
3. **Orchestrator** - Complex dependencies

### Low Risk Areas
1. **Utility functions** - Stateless, independent
2. **Quality checkers** - Simple dependencies
3. **Input validators** - No external dependencies

---

## 🔍 File-Specific Notes

### bin/localize.js
- **Challenge:** Dynamic config loading, multiple import paths
- **Solution:** Use top-level await for config loading
- **Testing:** Critical - entry point for entire application

### src/core/provider-factory.js
- **Challenge:** Dynamic provider selection
- **Solution:** Maintain same pattern with ESM imports
- **Testing:** Test all provider combinations

### src/utils/rate-limiter.js
- **Challenge:** Singleton export with state
- **Solution:** Keep same pattern, just change export syntax
- **Testing:** Verify queue management works

### src/utils/file-manager.js
- **Challenge:** Uses fs.promises
- **Solution:** `import { promises as fs } from 'fs';`
- **Testing:** Test all file operations

---

## 📚 Resources & References

### Official Documentation
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [ECMAScript Modules Specification](https://tc39.es/ecma262/#sec-modules)
- [Modules: CommonJS vs ES Modules](https://nodejs.org/api/modules.html)

### Migration Guides
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [CommonJS to ESM Migration](https://electerious.medium.com/from-commonjs-to-es-modules-how-to-modernize-your-node-js-app-ad8cdd4fb662)
- [Deno's CJS to ESM Guide](https://deno.com/blog/convert-cjs-to-esm)

### Tools
- [cjstoesm](https://github.com/wessberg/cjstoesm) - Automated conversion tool
- [depcheck](https://github.com/depcheck/depcheck) - Find unused dependencies
- [madge](https://github.com/pahen/madge) - Visualize module dependencies

---

## ✅ Success Criteria

Migration is complete when:
- [ ] All files use ESM syntax
- [ ] Package.json has `"type": "module"`
- [ ] All imports have `.js` extensions
- [ ] All CLI commands work
- [ ] All tests pass
- [ ] No CommonJS syntax remains
- [ ] Performance is maintained or improved
- [ ] Documentation updated
- [ ] Team can run locally without issues

---

## 🚨 Rollback Plan

If migration fails:
```bash
# Revert to pre-migration state
git reset --hard pre-esm-migration

# OR checkout backup
git checkout main
git branch -D feat/esm-migration

# OR restore from backup
cd ..
tar -xzf ai-localization-tool-backup-*.tar.gz
```

---

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Preparation & Backup | 15 min | None |
| Package.json Update | 15 min | Preparation |
| Utility Files (16 files) | 60 min | Package.json |
| Provider Files (6 files) | 30 min | Utilities |
| Core Files (4 files) | 30 min | Providers |
| Command Files (1 file) | 15 min | Core |
| Entry Point (1 file) | 15 min | Commands |
| Testing & Validation | 90 min | All conversions |
| **Total** | **~4.5 hours** | |

---

## 🎓 Key Learnings & Best Practices

### Do's ✅
- Use `.js` extensions in all relative imports
- Keep consistent export patterns (default vs named)
- Use top-level await when needed
- Add "type": "module" to package.json
- Test incrementally as you convert
- Document breaking changes

### Don'ts ❌
- Don't mix CommonJS and ESM in same file
- Don't forget file extensions
- Don't use `require()` syntax
- Don't rely on `__dirname` or `__filename`
- Don't skip testing after conversion
- Don't ignore linter warnings

---

## 💡 Next Steps After Migration

1. **TypeScript Migration** (Optional)
   - Add type definitions
   - Improve IDE support
   - Catch errors at compile time

2. **Build Optimization**
   - Add bundler (esbuild/rollup)
   - Implement tree-shaking
   - Reduce package size

3. **Module Exports**
   - Define clean public API
   - Add package.json exports map
   - Version your modules

4. **Documentation**
   - Update README with ESM examples
   - Add migration guide for users
   - Document breaking changes

---

## 📞 Support & Questions

**Questions during migration?**
- Check Node.js ESM docs: https://nodejs.org/api/esm.html
- Review this plan's troubleshooting section
- Test in isolation to identify issues
- Use `node --trace-warnings` for debugging

**Common debugging commands:**
```bash
# Show detailed error traces
node --trace-warnings bin/localize.js

# Check module resolution
node --experimental-loader ./loader.mjs bin/localize.js

# Verbose output
NODE_OPTIONS='--trace-warnings' node bin/localize.js --debug
```

---

**Migration Plan Version:** 1.0.0  
**Created:** 2025-10-14  
**Author:** AI Assistant (Qoder)  
**Last Updated:** 2025-10-14
