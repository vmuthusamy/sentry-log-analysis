# Production Authentication Checklist

This checklist prevents the authentication regressions that caused production login failures.

## 🚨 Critical Pre-Deployment Checks

### 1. TypeScript Compilation
- [ ] `npx tsc --noEmit server/replitAuth.ts` passes without errors
- [ ] No "Argument of type" errors in authentication files
- [ ] Proper type casting with `as Express.User` is present

### 2. Authentication Strategy Configuration
- [ ] Hostname-based strategy selection handles both production and localhost
- [ ] Fallback to first domain when hostname doesn't match
- [ ] All domains in REPLIT_DOMAINS have registered Passport strategies

### 3. Environment Variables
- [ ] REPLIT_DOMAINS is set and not empty
- [ ] REPL_ID is set and not empty  
- [ ] DATABASE_URL is set and not empty
- [ ] SESSION_SECRET is set (development and production)

### 4. Route Protection
- [ ] `setupAuth(app)` is called before route definitions
- [ ] Critical endpoints use `isAuthenticated` middleware
- [ ] Auth routes don't conflict with upload middleware

### 5. Error Response Validation
- [ ] Login endpoint returns 302 redirect (not upload errors)
- [ ] Protected endpoints return 401 with "Unauthorized" message
- [ ] No "UPLOAD_ERROR" responses from authentication endpoints
- [ ] No "Unknown authentication strategy" errors

## 🧪 Automated Test Commands

### Run Critical Auth Tests
```bash
npx vitest tests/auth-critical.test.ts --run
```

### Manual Endpoint Testing
```bash
# Test login endpoint (should redirect, not error)
curl -I http://localhost:5000/api/login

# Test protected endpoint (should return 401 Unauthorized)
curl http://localhost:5000/api/auth/user
```

### TypeScript Validation
```bash
# Check auth files compile without errors
npx tsc --noEmit server/replitAuth.ts server/routes.ts
```

## 🔍 Production Verification Steps

### 1. After Deployment
- [ ] Navigate to production `/api/login` - should redirect to Replit OAuth
- [ ] Login process completes successfully
- [ ] Dashboard loads after authentication
- [ ] No console errors related to authentication

### 2. Error Response Verification
- [ ] Unauthenticated requests to `/api/auth/user` return proper 401
- [ ] Error messages don't contain upload-related text
- [ ] Session cookies are set properly

### 3. Performance Check
- [ ] Authentication checks respond within 1000ms
- [ ] Concurrent requests don't cause authentication failures
- [ ] Session persistence works across page refreshes

## 🚫 Common Regression Patterns to Avoid

### TypeScript Errors
- ❌ `Argument of type '{}' is not assignable to parameter of type 'false | User | null | undefined'`
- ✅ Use proper type casting: `const user = {} as Express.User`

### Strategy Configuration Issues
- ❌ `Unknown authentication strategy "replitauth:localhost"`
- ✅ Implement hostname fallback logic with `domains.includes(hostname)`

### Upload Middleware Interference
- ❌ Auth endpoints returning `{"error": "UPLOAD_ERROR"}`
- ✅ Ensure `setupAuth(app)` runs before upload middleware setup

### Environment Variable Issues
- ❌ Missing or empty REPLIT_DOMAINS causing startup failures
- ✅ Validate environment variables with proper error messages

## 📋 CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Authentication Regression Tests
  run: |
    npx tsc --noEmit server/replitAuth.ts
    npx vitest tests/auth-critical.test.ts --run
    
- name: Manual Endpoint Verification
  run: |
    npm run dev &
    sleep 5
    curl -f http://localhost:5000/api/health
    curl -s http://localhost:5000/api/login | grep -v "upload\|file\|UPLOAD_ERROR"
```

## 📚 Reference

- Original Issue: Authentication endpoints returning upload middleware errors
- Root Cause: TypeScript errors in Passport verification callback
- Fix: Proper type casting and hostname-based strategy selection
- Prevention: Automated tests catching TypeScript and endpoint response regressions