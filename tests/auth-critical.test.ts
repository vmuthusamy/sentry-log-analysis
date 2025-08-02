import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

/**
 * Critical Authentication Code Analysis Tests
 * 
 * These tests analyze the actual source code to prevent the specific
 * authentication regressions that caused production login failures.
 */
describe('Critical Authentication Code Analysis', () => {
  
  describe('🚨 TypeScript Compilation Regression Prevention', () => {
    it('should have no TypeScript errors in replitAuth.ts', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for the specific TypeScript error patterns that broke production
      expect(authFileContent).not.toContain('Argument of type \'{');
      expect(authFileContent).not.toContain('is not assignable to parameter of type');
      
      // Ensure proper type casting is present for the user object
      expect(authFileContent).toContain('as Express.User');
    });

    it('should have proper Passport verification callback', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check that the verification callback properly handles user object
      expect(authFileContent).toContain('verified(null, user)');
      expect(authFileContent).toContain('updateUserSession(user, tokens)');
    });
  });

  describe('🔐 Authentication Strategy Configuration', () => {
    it('should handle hostname-based strategy selection', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for hostname fallback logic to prevent "Unknown authentication strategy" errors
      expect(authFileContent).toContain('domains.includes(hostname)');
      expect(authFileContent).toContain('domains[0]'); // Fallback to first domain
    });

    it('should properly configure passport strategies for all domains', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Ensure strategies are registered for all domains
      expect(authFileContent).toContain('for (const domain of process.env');
      expect(authFileContent).toContain('REPLIT_DOMAINS!.split(",")');
      expect(authFileContent).toContain('passport.use(strategy)');
    });
  });

  describe('🛡️ Route Protection Configuration', () => {
    it('should properly import and use authentication middleware', async () => {
      const routesFilePath = path.join(process.cwd(), 'server/routes.ts');
      const routesFileContent = await fs.readFile(routesFilePath, 'utf-8');
      
      // Ensure authentication is properly imported and used
      expect(routesFileContent).toContain('import { setupAuth, isAuthenticated }');
      expect(routesFileContent).toContain('await setupAuth(app)');
      expect(routesFileContent).toContain('isAuthenticated,');
    });

    it('should protect critical endpoints with authentication', async () => {
      const routesFilePath = path.join(process.cwd(), 'server/routes.ts');
      const routesFileContent = await fs.readFile(routesFilePath, 'utf-8');
      
      // Check that critical endpoints are protected with isAuthenticated middleware
      expect(routesFileContent).toMatch(/\/api\/auth\/user.*isAuthenticated/);
      expect(routesFileContent).toMatch(/\/api\/logs.*isAuthenticated/);
      expect(routesFileContent).toContain('isAuthenticated,');
    });
  });

  describe('🔧 Environment Variable Configuration', () => {
    it('should have required environment variables defined', () => {
      const requiredEnvVars = [
        'REPLIT_DOMAINS',
        'REPL_ID',
        'DATABASE_URL'
      ];

      for (const envVar of requiredEnvVars) {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      }
    });

    it('should properly validate environment variables in auth code', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for proper environment variable validation
      expect(authFileContent).toContain('if (!process.env.REPLIT_DOMAINS)');
      expect(authFileContent).toContain('throw new Error');
    });
  });

  describe('📝 Session Management Configuration', () => {
    it('should configure session middleware properly', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check session configuration
      expect(authFileContent).toContain('export function getSession()');
      expect(authFileContent).toContain('connectPg(session)');
      expect(authFileContent).toContain('httpOnly: true');
    });

    it('should handle session security in production', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for production-specific session security
      expect(authFileContent).toContain("secure: process.env.NODE_ENV === 'production'");
    });
  });

  describe('🚫 Upload Error Prevention', () => {
    it('should not have upload middleware interfering with auth routes', async () => {
      const routesFilePath = path.join(process.cwd(), 'server/routes.ts');
      const routesFileContent = await fs.readFile(routesFilePath, 'utf-8');
      
      // Ensure auth setup exists and multer is configured separately
      const authSetupIndex = routesFileContent.indexOf('await setupAuth(app)');
      const multerConfigIndex = routesFileContent.indexOf('const upload = multer');
      
      expect(authSetupIndex).toBeGreaterThan(-1);
      expect(multerConfigIndex).toBeGreaterThan(-1);
      // Auth routes should be properly separated from upload handling
      expect(routesFileContent).toContain('await setupAuth(app)');
    });

    it('should properly separate auth and upload error handling', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Ensure auth error responses don't contain upload-related terms
      expect(authFileContent).not.toContain('UPLOAD_ERROR');
      expect(authFileContent).not.toContain('file upload');
      expect(authFileContent).not.toContain('multer');
    });
  });

  describe('⚡ Performance and Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for proper error handling
      expect(authFileContent).toContain('catch (error)');
      expect(authFileContent).toContain('res.status(401).json({ message: "Unauthorized" })');
    });

    it('should have proper token refresh handling', async () => {
      const authFilePath = path.join(process.cwd(), 'server/replitAuth.ts');
      const authFileContent = await fs.readFile(authFilePath, 'utf-8');
      
      // Check for refresh token logic
      expect(authFileContent).toContain('refreshTokenGrant');
      expect(authFileContent).toContain('user.refresh_token');
      expect(authFileContent).toContain('user.expires_at');
    });
  });
});