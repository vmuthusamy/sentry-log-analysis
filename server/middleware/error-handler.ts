import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics-service';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileSizeError extends Error {
  constructor(message: string, public actualSize: number, public maxSize: number) {
    super(message);
    this.name = 'FileSizeError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public stage?: string, public originalError?: Error) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export function handleMulterErrors(error: any, req: Request, res: Response, next: NextFunction) {
  if (error) {
    const userId = (req as any).user?.id || 'anonymous';
    
    // Handle file size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      const fileSizeMB = Math.round(error.limit / (1024 * 1024));
      metricsService.trackFileUpload(
        userId,
        'oversized',
        req.file?.originalname || 'unknown',
        error.limit || 0,
        'failure',
        `File too large. Maximum size is ${fileSizeMB}MB`
      );
      
      return res.status(413).json({
        message: `File too large. Maximum size allowed is ${fileSizeMB}MB`,
        error: 'FILE_TOO_LARGE',
        maxSize: fileSizeMB,
        details: {
          code: 'LIMIT_FILE_SIZE',
          limit: error.limit
        }
      });
    }
    
    // Handle file count errors
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Please upload one file at a time',
        error: 'TOO_MANY_FILES',
        details: { code: 'LIMIT_FILE_COUNT' }
      });
    }
    
    // Handle field name errors
    if (error.code === 'LIMIT_FIELD_KEY') {
      return res.status(400).json({
        message: 'Field name too long',
        error: 'FIELD_NAME_TOO_LONG',
        details: { code: 'LIMIT_FIELD_KEY' }
      });
    }
    
    // Handle field value errors
    if (error.code === 'LIMIT_FIELD_VALUE') {
      return res.status(400).json({
        message: 'Field value too long',
        error: 'FIELD_VALUE_TOO_LONG',
        details: { code: 'LIMIT_FIELD_VALUE' }
      });
    }
    
    // Handle field count errors
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        message: 'Too many fields',
        error: 'TOO_MANY_FIELDS',
        details: { code: 'LIMIT_FIELD_COUNT' }
      });
    }
    
    // Handle unexpected field errors
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected file field',
        error: 'UNEXPECTED_FILE_FIELD',
        details: { code: 'LIMIT_UNEXPECTED_FILE' }
      });
    }
    
    // Handle custom file filter errors
    if (error.message.includes('Only .txt and .log files are allowed')) {
      metricsService.trackFileUpload(
        userId,
        'invalid-type',
        req.file?.originalname || 'unknown',
        req.file?.size || 0,
        'failure',
        error.message
      );
      
      return res.status(400).json({
        message: error.message,
        error: 'INVALID_FILE_TYPE',
        allowedTypes: ['.txt', '.log'],
        details: { 
          receivedType: req.file?.mimetype,
          fileName: req.file?.originalname 
        }
      });
    }
    
    // Handle filename validation errors
    if (error.message.includes('Filename')) {
      return res.status(400).json({
        message: error.message,
        error: 'INVALID_FILENAME',
        details: { fileName: req.file?.originalname }
      });
    }
    
    // Generic multer error
    console.error('Multer error:', error);
    return res.status(400).json({
      message: 'File upload error',
      error: 'UPLOAD_ERROR',
      details: { 
        code: error.code,
        message: error.message 
      }
    });
  }
  
  next();
}

export function globalErrorHandler(error: AppError, req: Request, res: Response, next: NextFunction) {
  // Log error details
  console.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: (req as any).user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  // Track error metrics
  const userId = (req as any).user?.id || 'anonymous';
  
  if (statusCode >= 500) {
    // Server errors
    metricsService.trackFileUpload(
      userId,
      'server-error',
      'system',
      0,
      'failure',
      `${statusCode}: ${message}`
    );
  }
  
  // Security: Don't expose stack traces in production
  const response: any = {
    message,
    error: error.name || 'ServerError',
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = error.details;
  }
  
  // Add request ID for debugging
  response.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: 'Route not found',
    error: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}