#!/bin/bash

echo "=== JWT Authentication Middleware Setup Validation ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_PATH="/Users/julianbradley/CODEING /sierra-fred-carey"
ERRORS=0

# Function to check file
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        local lines=$(wc -l < "$file")
        echo -e "${GREEN}✓${NC} $description ($lines lines)"
    else
        echo -e "${RED}✗${NC} $description - NOT FOUND: $file"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check content
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description - Pattern not found"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "Checking Core Files..."
check_file "$BASE_PATH/middleware.ts" "Middleware (middleware.ts)"
check_file "$BASE_PATH/types/auth.ts" "Auth Types (types/auth.ts)"
check_file "$BASE_PATH/lib/auth/token.ts" "Token Utils (lib/auth/token.ts)"
check_file "$BASE_PATH/lib/auth/middleware-utils.ts" "Middleware Utils (lib/auth/middleware-utils.ts)"
check_file "$BASE_PATH/lib/auth/middleware-example.ts" "Examples (lib/auth/middleware-example.ts)"
check_file "$BASE_PATH/lib/auth/__tests__/token.test.ts" "Tests (lib/auth/__tests__/token.test.ts)"

echo ""
echo "Checking Documentation..."
check_file "$BASE_PATH/docs/MIDDLEWARE_SETUP.md" "Setup Guide (docs/MIDDLEWARE_SETUP.md)"
check_file "$BASE_PATH/AUTHENTICATION_QUICK_REFERENCE.md" "Quick Reference"
check_file "$BASE_PATH/JWT_MIDDLEWARE_SUMMARY.md" "Summary Document"

echo ""
echo "Checking Configuration..."
check_file "$BASE_PATH/.env.example" "Environment Template (.env.example)"
check_content "$BASE_PATH/.env.example" "JWT_SECRET" "JWT_SECRET in .env.example"

echo ""
echo "Checking Dependencies..."
check_content "$BASE_PATH/package.json" "jose" "jose library installed"

echo ""
echo "Checking Code Quality..."
check_content "$BASE_PATH/middleware.ts" "jwtVerify" "JWT verification imported"
check_content "$BASE_PATH/middleware.ts" "NextRequest" "Next.js types imported"
check_content "$BASE_PATH/middleware.ts" "export const config" "Middleware matcher exported"
check_content "$BASE_PATH/types/auth.ts" "interface JWTPayload" "JWT payload type defined"
check_content "$BASE_PATH/lib/auth/token.ts" "signJWT" "signJWT function exists"
check_content "$BASE_PATH/lib/auth/token.ts" "verifyToken" "verifyToken function exists"

echo ""
echo "=== Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Generate JWT_SECRET: openssl rand -base64 32"
    echo "2. Add to .env.local: JWT_SECRET=<generated-secret>"
    echo "3. Create login endpoint using lib/auth/middleware-example.ts as template"
    echo "4. Run tests: npm test lib/auth/__tests__/token.test.ts"
    echo "5. Test locally: npm run dev"
    exit 0
else
    echo -e "${RED}$ERRORS checks failed!${NC}"
    echo "Please review the missing files above."
    exit 1
fi
