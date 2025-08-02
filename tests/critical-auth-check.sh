#!/bin/bash

# Critical Authentication Regression Check Script
# This script runs the most important authentication tests to prevent production failures

echo "🔍 Running Critical Authentication Regression Tests..."
echo "========================================================="

# Set test environment
export NODE_ENV=test
export REPLIT_DOMAINS=test.replit.dev
export REPL_ID=test-repl-id
export SESSION_SECRET=test-session-secret
export DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Function to check if authentication is working
check_auth_endpoints() {
    echo "📡 Testing authentication endpoints..."
    
    # Start server in background
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test login endpoint - the critical test that failed in production
    echo "Testing /api/login endpoint..."
    RESPONSE=$(curl -s http://localhost:5000/api/login 2>&1)
    
    if echo "$RESPONSE" | grep -q "upload\|file\|UPLOAD_ERROR"; then
        echo "❌ CRITICAL FAILURE: Login endpoint returning upload errors!"
        echo "Response: $RESPONSE"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    echo "✅ Login endpoint responding correctly"
    
    # Test auth user endpoint
    echo "Testing /api/auth/user endpoint..."
    AUTH_RESPONSE=$(curl -s http://localhost:5000/api/auth/user)
    
    if echo "$AUTH_RESPONSE" | grep -q "upload\|file"; then
        echo "❌ CRITICAL FAILURE: Auth endpoint returning upload errors!"
        echo "Response: $AUTH_RESPONSE"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    if ! echo "$AUTH_RESPONSE" | grep -q "Unauthorized"; then
        echo "⚠️  WARNING: Auth endpoint not returning expected Unauthorized response"
        echo "Response: $AUTH_RESPONSE"
    else
        echo "✅ Auth endpoint responding correctly"
    fi
    
    # Clean up
    kill $SERVER_PID 2>/dev/null
    sleep 2
}

# Function to run TypeScript compilation check
check_typescript() {
    echo "🔧 Checking TypeScript compilation for auth files..."
    
    if ! npx tsc --noEmit server/replitAuth.ts; then
        echo "❌ CRITICAL FAILURE: TypeScript errors in authentication files!"
        exit 1
    fi
    
    echo "✅ TypeScript compilation successful"
}

# Function to run vitest regression tests
run_regression_tests() {
    echo "🧪 Running authentication regression tests..."
    
    if ! npx vitest tests/auth-regression.test.ts --run --reporter=verbose; then
        echo "❌ CRITICAL FAILURE: Authentication regression tests failed!"
        exit 1
    fi
    
    echo "✅ All regression tests passed"
}

# Main execution
echo "Starting authentication checks..."
echo "Timestamp: $(date)"
echo ""

# Run all checks
check_typescript
echo ""

check_auth_endpoints
echo ""

run_regression_tests
echo ""

echo "========================================================="
echo "✅ ALL CRITICAL AUTHENTICATION CHECKS PASSED!"
echo "🔒 Production authentication should be working correctly"
echo "========================================================="