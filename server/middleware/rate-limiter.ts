import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(req: Request, identifier: string): string {
    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${identifier}:${userId || ip}`;
  }

  createRateLimit(options: {
    windowMs: number;
    max: number;
    identifier: string;
    message?: string;
    skipSuccessfulRequests?: boolean;
  }) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req, options.identifier);
      const now = Date.now();
      
      let entry = this.store.get(key);
      
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + options.windowMs,
          lastRequest: now
        };
      }

      // Check if request should be rate limited
      if (entry.count >= options.max) {
        const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);
        
        return res.status(429).json({
          message: options.message || 'Too many requests',
          retryAfter: timeUntilReset,
          limit: options.max,
          remaining: 0
        });
      }

      // Increment counter
      entry.count++;
      entry.lastRequest = now;
      this.store.set(key, entry);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.max - entry.count).toString(),
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
      });

      next();
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configured rate limiters for different endpoints
export const uploadRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  identifier: 'upload',
  message: 'Too many file uploads. Please wait before uploading again.'
});

export const apiRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 API calls per 15 minutes
  identifier: 'api',
  message: 'Too many API requests. Please slow down.'
});

export const loginRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  identifier: 'login',
  message: 'Too many login attempts. Please try again later.'
});

export const analysisRateLimit = rateLimiter.createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 analysis requests per 5 minutes (AI is expensive)
  identifier: 'analysis',
  message: 'Too many analysis requests. AI processing is resource-intensive.'
});

// Cleanup on process exit
process.on('SIGTERM', () => rateLimiter.destroy());
process.on('SIGINT', () => rateLimiter.destroy());