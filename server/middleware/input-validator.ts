import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import validator from 'validator';

// Enhanced validation schemas with SQL injection protection
export const userInputSchema = z.object({
  // Basic string validation - no SQL keywords, special characters sanitized
  safeString: z.string()
    .min(1)
    .max(1000)
    .refine((val) => !containsSQLInjection(val), {
      message: "Invalid characters detected in input"
    }),
  
  // Email validation
  email: z.string()
    .email()
    .refine((email) => validator.isEmail(email), {
      message: "Invalid email format"
    }),
  
  // URL validation for webhooks
  webhookUrl: z.string()
    .url()
    .refine((url) => {
      return validator.isURL(url, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_host: true,
        require_valid_protocol: true
      });
    }, {
      message: "Invalid webhook URL format"
    }),
  
  // Risk score validation
  riskScore: z.number()
    .min(0)
    .max(10)
    .refine((score) => Number.isFinite(score), {
      message: "Risk score must be a valid number"
    }),
  
  // UUID validation
  uuid: z.string()
    .uuid("Invalid ID format"),
  
  // File upload validation
  filename: z.string()
    .min(1)
    .max(255)
    .refine((name) => {
      // Only allow alphanumeric, dots, hyphens, underscores with .txt or .log extension
      return /^[a-zA-Z0-9._-]+\.(txt|log)$/i.test(name);
    }, {
      message: "Invalid filename format. Only letters, numbers, dots, hyphens, underscores, and .txt/.log extensions are allowed."
    }),
  
  // JSON object validation
  jsonObject: z.record(z.unknown())
    .refine((obj) => {
      const str = JSON.stringify(obj);
      return !containsSQLInjection(str);
    }, {
      message: "Invalid data in JSON object"
    })
});

// SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
  // Basic SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(;|\|\||&&|\/\*|\*\/|--|#|xp_)/i,
  /(\b(WAITFOR|DELAY|BENCHMARK|SLEEP)\b)/i,
  /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR|CAST|CONVERT)\b\s*\()/i,
  /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS|MSysObjects)\b)/i,
  /((\%27)|(\')|(\')|(%2D)|(-)|(%2B)|(\+))/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\')|(\%3B)|(;))/i,
  /\w*((\%27)|(\')|(\')|(\%3B)|(;))/i,
  /((\%27)|(\')|(\')|(\%3B)|(;))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\')|(\')|(\%3B)|(;))\s*((\%73)|s|(\%53))((\%65)|e|(\%45))((\%6C)|l|(\%4C))((\%65)|e|(\%45))((\%63)|c|(\%43))((\%74)|t|(\%54))/i,
  /((\%27)|(\')|(\')|(\%3B)|(;))\s*((\%69)|i|(\%49))((\%6E)|n|(\%4E))((\%73)|s|(\%53))((\%65)|e|(\%45))((\%72)|r|(\%52))((\%74)|t|(\%54))/i,
  /((\%27)|(\')|(\')|(\%3B)|(;))\s*((\%64)|d|(\%44))((\%65)|e|(\%45))((\%6C)|l|(\%4C))((\%65)|e|(\%45))((\%74)|t|(\%54))((\%65)|e|(\%45))/i
];

// XSS detection patterns
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[\s\S]*?onerror[\s\S]*?>/gi,
  /<svg[\s\S]*?onload[\s\S]*?>/gi
];

// Function to detect SQL injection attempts
export function containsSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const decoded = decodeURIComponent(input.toLowerCase());
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(decoded)) ||
         XSS_PATTERNS.some(pattern => pattern.test(decoded));
}

// Function to sanitize string input
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return validator.escape(input)
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .trim();
}

// Comprehensive validation middleware
export function validateInput(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize request body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = sanitizeRequestData(req.body);
        const validatedBody = schema.parse(req.body);
        req.body = validatedBody;
      }
      
      // Validate and sanitize query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = sanitizeRequestData(req.query);
      }
      
      // Validate and sanitize URL parameters
      if (req.params && Object.keys(req.params).length > 0) {
        req.params = sanitizeRequestData(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Input validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      return res.status(400).json({
        message: 'Invalid input detected',
        error: 'Security validation failed'
      });
    }
  };
}

// Recursive function to sanitize request data
function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    if (containsSQLInjection(data)) {
      throw new Error('Potentially malicious input detected');
    }
    return sanitizeString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeRequestData(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeString(key);
      if (containsSQLInjection(sanitizedKey)) {
        throw new Error('Potentially malicious input detected in key');
      }
      sanitized[sanitizedKey] = sanitizeRequestData(value);
    }
    return sanitized;
  }
  
  return data;
}

// Specific validation schemas for different endpoints
export const webhookValidationSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .refine((val) => !containsSQLInjection(val), "Invalid characters in name"),
  
  provider: z.enum(['zapier', 'make', 'custom'], {
    errorMap: () => ({ message: "Invalid provider" })
  }),
  
  webhookUrl: userInputSchema.shape.webhookUrl,
  
  isActive: z.boolean().optional(),
  
  triggerConditions: z.object({
    minRiskScore: z.number().min(0).max(10).optional(),
    anomalyTypes: z.array(z.string().max(50)).max(20).optional(),
    priorities: z.array(z.enum(['low', 'medium', 'high', 'critical'])).max(10).optional(),
    keywords: z.array(z.string().max(100)).max(50).optional()
  }).optional(),
  
  payloadTemplate: z.record(z.unknown()).optional()
});

export const anomalyValidationSchema = z.object({
  status: z.enum(['pending', 'under_review', 'confirmed', 'false_positive', 'dismissed']).optional(),
  analystNotes: z.string().max(5000).optional().refine((val) => {
    return !val || !containsSQLInjection(val);
  }, "Invalid characters in notes"),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  reviewedAt: z.string().datetime().optional()
});

export const userApiKeyValidationSchema = z.object({
  provider: z.enum(['openai', 'gemini'], {
    errorMap: () => ({ message: "Invalid API provider" })
  }),
  apiKey: z.string()
    .min(1, "API key is required")
    .max(500, "API key too long")
    .refine((val) => !containsSQLInjection(val), "Invalid API key format")
});

export const fileUploadValidationSchema = z.object({
  filename: userInputSchema.shape.filename,
  originalName: z.string().max(255).refine((val) => !containsSQLInjection(val)),
  size: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
  mimetype: z.enum(['text/plain', 'application/octet-stream'])
});

// Rate limiting validation
export const rateLimitValidationSchema = z.object({
  userId: userInputSchema.shape.uuid,
  action: z.enum(['upload', 'analysis', 'api', 'login']),
  timestamp: z.number().min(0)
});