import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extended request interface with user data
interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware to check if user has system-level access
 */
export const requireSystemAccess = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = (req.user as any).claims?.sub || (req.user as any).id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    // Get user from database to check permissions
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has system-level access
    const hasSystemAccess = user.isSystemUser || 
                           user.role === 'system' || 
                           user.role === 'admin' ||
                           (user.permissions && user.permissions.includes('system_analytics'));

    if (!hasSystemAccess) {
      return res.status(403).json({ 
        message: "System-level access required",
        requiredRole: "system or admin",
        userRole: user.role
      });
    }

    // Add user info to request (extend existing user object)
    (req as any).systemUser = {
      id: user.id,
      email: user.email || '',
      role: user.role || 'user',
      permissions: user.permissions || [],
      isSystemUser: user.isSystemUser || false
    };

    next();
  } catch (error) {
    console.error("System access check error:", error);
    res.status(500).json({ message: "Authorization check failed" });
  }
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const systemUser = (req as any).systemUser;
      if (!systemUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const hasPermission = systemUser.permissions.includes(permission) ||
                          systemUser.role === 'system' ||
                          systemUser.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Permission required: ${permission}`,
          userPermissions: systemUser.permissions
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

/**
 * Utility function to promote a user to system level
 */
export const promoteToSystemUser = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return false;
    }

    await storage.updateUser(userId, {
      role: 'system',
      isSystemUser: true,
      permissions: ['system_analytics', 'user_management', 'security_logs']
    });

    return true;
  } catch (error) {
    console.error("Error promoting user to system level:", error);
    return false;
  }
};

/**
 * Check if current user can access analytics
 */
export const canAccessAnalytics = (user: any): boolean => {
  return user?.isSystemUser || 
         user?.role === 'system' || 
         user?.role === 'admin' ||
         (user?.permissions && user.permissions.includes('system_analytics'));
};