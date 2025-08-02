import { Request, Response, NextFunction } from "express";
import { JSDOM } from "jsdom";
const window = new JSDOM('').window;
// @ts-ignore
import DOMPurify from "dompurify";
import validator from "validator";

// Security validation middleware for log file content
export class SecurityValidator {
  // Patterns that could indicate injection attempts
  private static DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /('|(\\)|;|(\\|)|(\*)|(%)|(\-\-)|(\+))/gi,
    /(union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+set)/gi,
    
    // Script injection patterns
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Command injection patterns
    /(\||;|&|`|\$\(|\$\{)/g,
    /(rm\s+-rf|curl|wget|nc\s+-|sh\s+-c)/gi,
    
    // Path traversal patterns
    /(\.\.|\/etc\/|\/proc\/|\/sys\/|\\\\|\.\.\\)/gi,
    
    // Binary executable patterns
    /\x7fELF/g, // ELF header
    /MZ\x90/g, // PE header
    /\x89PNG/g, // PNG header (not text)
    /\xFF\xD8\xFF/g, // JPEG header
  ];

  // Maximum file size (10MB)
  private static MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Maximum line length to prevent buffer overflow
  private static MAX_LINE_LENGTH = 10000;
  
  // Maximum number of lines
  private static MAX_LINES = 100000;

  /**
   * Validate uploaded log file for security threats
   */
  static validateLogFile(fileContent: Buffer, filename: string): {
    isValid: boolean;
    threats: string[];
    sanitizedContent?: string;
  } {
    const threats: string[] = [];
    
    // Size validation
    if (fileContent.length > this.MAX_FILE_SIZE) {
      threats.push("File size exceeds maximum allowed limit");
      return { isValid: false, threats };
    }

    // Binary content detection
    if (this.containsBinaryContent(fileContent)) {
      threats.push("Binary content detected in log file");
      return { isValid: false, threats };
    }

    const content = fileContent.toString('utf8');
    
    // Line count and length validation
    const lines = content.split('\n');
    if (lines.length > this.MAX_LINES) {
      threats.push(`Too many lines: ${lines.length} (max: ${this.MAX_LINES})`);
    }

    // Check each line for threats
    for (let i = 0; i < Math.min(lines.length, 1000); i++) { // Sample first 1000 lines
      const line = lines[i];
      
      if (line.length > this.MAX_LINE_LENGTH) {
        threats.push(`Line ${i + 1} exceeds maximum length`);
        continue;
      }

      // Check for dangerous patterns
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(line)) {
          threats.push(`Suspicious pattern detected on line ${i + 1}: ${pattern.source.substring(0, 50)}`);
        }
      }
    }

    // Filename validation
    if (!this.isValidFilename(filename)) {
      threats.push("Invalid filename detected");
    }

    // Sanitize content if validation passes
    let sanitizedContent: string | undefined;
    if (threats.length === 0) {
      sanitizedContent = this.sanitizeLogContent(content);
    }

    return {
      isValid: threats.length === 0,
      threats,
      sanitizedContent
    };
  }

  /**
   * Check if content contains binary data
   */
  private static containsBinaryContent(buffer: Buffer): boolean {
    // Check for null bytes and other binary indicators
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      const byte = buffer[i];
      // Check for control characters that shouldn't be in text logs
      if (byte === 0 || (byte < 9 && byte !== 8) || (byte > 13 && byte < 32 && byte !== 27)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate filename for security
   */
  private static isValidFilename(filename: string): boolean {
    // Check for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Check for valid extensions
    const validExtensions = ['.log', '.txt', '.tsv', '.csv'];
    const hasValidExtension = validExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return false;
    }

    // Check filename length and characters
    if (filename.length > 255 || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize log content while preserving log structure
   */
  private static sanitizeLogContent(content: string): string {
    // Split into lines and sanitize each
    const lines = content.split('\n');
    const sanitizedLines = lines.map(line => {
      // Basic HTML/script sanitization
      let sanitized = DOMPurify(window).sanitize(line, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });

      // Escape potential SQL injection characters while preserving log format
      sanitized = sanitized.replace(/['"\\]/g, '\\$&');
      
      // Remove or escape shell metacharacters
      sanitized = sanitized.replace(/[`$(){}[\]|&;]/g, '\\$&');

      return sanitized;
    });

    return sanitizedLines.join('\n');
  }

  /**
   * Validate user input for SQL queries (for analytics)
   */
  static validateSqlInput(input: string): boolean {
    // Whitelist approach for analytics parameters
    const allowedPatterns = [
      /^\d+$/, // Numbers only
      /^[a-zA-Z0-9_-]+$/, // Alphanumeric with underscore/hyphen
      /^\d{4}-\d{2}-\d{2}$/, // Date format YYYY-MM-DD
    ];

    return allowedPatterns.some(pattern => pattern.test(input)) && input.length <= 100;
  }

  /**
   * Rate limiting validation
   */
  static validateUploadRate(userId: string, uploadCount: number, timeWindow: number): boolean {
    const maxUploadsPerWindow = 10; // 10 uploads per time window
    return uploadCount <= maxUploadsPerWindow;
  }
}

/**
 * Express middleware for file upload security
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const validation = SecurityValidator.validateLogFile(req.file.buffer, req.file.originalname);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      message: "File validation failed",
      threats: validation.threats
    });
  }

  // Attach sanitized content to request
  (req as any).sanitizedContent = validation.sanitizedContent;
  next();
};

/**
 * Middleware for validating analytics query parameters
 */
export const validateAnalyticsParams = (req: Request, res: Response, next: NextFunction) => {
  const { days, limit, userId, startDate, endDate } = req.query;

  if (days && !SecurityValidator.validateSqlInput(days as string)) {
    return res.status(400).json({ message: "Invalid days parameter" });
  }

  if (limit && !SecurityValidator.validateSqlInput(limit as string)) {
    return res.status(400).json({ message: "Invalid limit parameter" });
  }

  if (userId && !SecurityValidator.validateSqlInput(userId as string)) {
    return res.status(400).json({ message: "Invalid userId parameter" });
  }

  if (startDate && !SecurityValidator.validateSqlInput(startDate as string)) {
    return res.status(400).json({ message: "Invalid startDate parameter" });
  }

  if (endDate && !SecurityValidator.validateSqlInput(endDate as string)) {
    return res.status(400).json({ message: "Invalid endDate parameter" });
  }

  next();
};