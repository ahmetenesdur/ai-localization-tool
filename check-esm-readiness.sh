#!/bin/bash

# ESM Migration Readiness Checker
# This script checks if your codebase is ready for ESM migration

echo "🔍 ESM Migration Readiness Check"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    else
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

# Check 1: Node.js version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status "PASS" "Node.js version $(node --version) supports ESM well"
elif [ "$NODE_VERSION" -ge 14 ]; then
    print_status "WARN" "Node.js version $(node --version) supports ESM, but v18+ recommended"
else
    print_status "FAIL" "Node.js version $(node --version) is too old. Need v14.13.0+"
fi
echo ""

# Check 2: Dependencies
echo "2️⃣  Checking dependencies for ESM compatibility..."
deps_ok=true
if ! command -v npm &> /dev/null; then
    print_status "FAIL" "npm not found"
    deps_ok=false
else
    # Check axios
    if npm list axios &> /dev/null; then
        print_status "PASS" "axios is installed and ESM-compatible"
    else
        print_status "WARN" "axios not found in dependencies"
    fi
    
    # Check commander
    if npm list commander &> /dev/null; then
        print_status "PASS" "commander is installed and ESM-compatible"
    else
        print_status "WARN" "commander not found in dependencies"
    fi
    
    # Check dotenv
    if npm list dotenv &> /dev/null; then
        print_status "PASS" "dotenv is installed and ESM-compatible"
    else
        print_status "WARN" "dotenv not found in dependencies"
    fi
    
    # Check lru-cache
    if npm list lru-cache &> /dev/null; then
        LRU_VERSION=$(npm list lru-cache --depth=0 2>/dev/null | grep lru-cache | cut -d'@' -f2 | cut -d'.' -f1)
        if [ "$LRU_VERSION" -ge 10 ]; then
            print_status "PASS" "lru-cache v$LRU_VERSION is ESM-only (perfect!)"
        else
            print_status "WARN" "lru-cache version is old, consider upgrading to v10+"
        fi
    else
        print_status "WARN" "lru-cache not found in dependencies"
    fi
fi
echo ""

# Check 3: File structure
echo "3️⃣  Analyzing codebase structure..."
JS_FILES=$(find src bin -name "*.js" 2>/dev/null | wc -l)
print_status "INFO" "Found $JS_FILES JavaScript files to convert"
echo ""

# Check 4: CommonJS patterns
echo "4️⃣  Checking for CommonJS patterns..."
REQUIRE_COUNT=$(grep -r "require(" src/ bin/ 2>/dev/null | grep -v node_modules | wc -l)
MODULE_EXPORTS_COUNT=$(grep -r "module.exports" src/ bin/ 2>/dev/null | grep -v node_modules | wc -l)
EXPORTS_COUNT=$(grep -r "^exports\." src/ bin/ 2>/dev/null | grep -v node_modules | wc -l)

print_status "INFO" "Found $REQUIRE_COUNT require() statements"
print_status "INFO" "Found $MODULE_EXPORTS_COUNT module.exports statements"
print_status "INFO" "Found $EXPORTS_COUNT exports. statements"

TOTAL_CONVERSIONS=$((REQUIRE_COUNT + MODULE_EXPORTS_COUNT + EXPORTS_COUNT))
print_status "INFO" "Total conversions needed: ~$TOTAL_CONVERSIONS"
echo ""

# Check 5: __dirname and __filename usage
echo "5️⃣  Checking for Node.js globals..."
DIRNAME_COUNT=$(grep -r "__dirname" src/ bin/ 2>/dev/null | grep -v node_modules | wc -l)
FILENAME_COUNT=$(grep -r "__filename" src/ bin/ 2>/dev/null | grep -v node_modules | wc -l)

if [ "$DIRNAME_COUNT" -eq 0 ] && [ "$FILENAME_COUNT" -eq 0 ]; then
    print_status "PASS" "No __dirname or __filename usage found (good!)"
else
    print_status "WARN" "Found __dirname ($DIRNAME_COUNT) or __filename ($FILENAME_COUNT) usage - need replacement"
fi
echo ""

# Check 6: Circular dependencies (basic check)
echo "6️⃣  Checking for potential circular dependencies..."
if command -v madge &> /dev/null; then
    CIRCULAR=$(madge --circular --extensions js src/ 2>/dev/null)
    if [ -z "$CIRCULAR" ]; then
        print_status "PASS" "No circular dependencies detected"
    else
        print_status "WARN" "Circular dependencies found - may need refactoring"
        echo "$CIRCULAR"
    fi
else
    print_status "INFO" "madge not installed - skipping circular dependency check"
    print_status "INFO" "Install with: npm install -g madge"
fi
echo ""

# Check 7: Git status
echo "7️⃣  Checking Git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        print_status "PASS" "Working directory is clean"
    else
        print_status "WARN" "Uncommitted changes found - commit before migration"
    fi
    
    # Check if on main/master
    BRANCH=$(git branch --show-current)
    if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
        print_status "WARN" "Currently on $BRANCH - create a feature branch first"
    else
        print_status "PASS" "On feature branch: $BRANCH"
    fi
else
    print_status "WARN" "Not a git repository"
fi
echo ""

# Check 8: Backup exists
echo "8️⃣  Checking for backups..."
if [ -f "../ai-localization-tool-backup-"*.tar.gz ]; then
    print_status "PASS" "Backup file found"
else
    print_status "WARN" "No backup found - create one before migration"
fi
echo ""

# Check 9: Tests
echo "9️⃣  Checking for test infrastructure..."
if [ -f "package.json" ]; then
    if grep -q "\"test\":" package.json; then
        print_status "PASS" "Test script found in package.json"
    else
        print_status "WARN" "No test script in package.json - testing will be manual"
    fi
else
    print_status "FAIL" "package.json not found"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Summary"
echo "=================================="
echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
echo ""

# Readiness assessment
SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo "Readiness Score: $SCORE%"
echo ""

if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo -e "${RED}❌ NOT READY${NC}: Fix failed checks before proceeding"
    exit 1
elif [ "$WARNING_CHECKS" -gt 3 ]; then
    echo -e "${YELLOW}⚠️  CAUTION${NC}: Address warnings before migration"
    exit 0
else
    echo -e "${GREEN}✅ READY${NC}: You can proceed with ESM migration"
    exit 0
fi
