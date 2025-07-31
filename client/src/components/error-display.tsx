import { AlertTriangle, Clock, Upload, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  error: {
    message: string;
    error?: string;
    details?: any;
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    maxSize?: number;
    allowedTypes?: string[];
  };
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const getErrorIcon = () => {
    if (error.error?.includes('RATE_LIMIT') || error.error?.includes('TOO_MANY')) {
      return <Clock className="h-4 w-4" />;
    }
    if (error.error?.includes('FILE_TOO_LARGE') || error.error?.includes('UPLOAD')) {
      return <Upload className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getErrorColor = () => {
    if (error.error?.includes('RATE_LIMIT')) {
      return 'default'; // Blue for rate limits (temporary)
    }
    return 'destructive'; // Red for other errors
  };

  const getErrorTitle = () => {
    if (error.error?.includes('RATE_LIMIT') || error.message.includes('Too many')) {
      return 'Rate Limit Reached';
    }
    if (error.error?.includes('FILE_TOO_LARGE')) {
      return 'File Too Large';
    }
    if (error.error?.includes('INVALID_FILE_TYPE')) {
      return 'Invalid File Type';
    }
    return 'Error';
  };

  const getHelpfulMessage = () => {
    if (error.error?.includes('RATE_LIMIT') || error.message.includes('Too many')) {
      const timeLeft = error.retryAfter ? `${error.retryAfter} seconds` : 'a few minutes';
      return (
        <div className="space-y-2">
          <p>{error.message}</p>
          <div className="text-sm text-muted-foreground">
            <p>Please wait {timeLeft} before trying again.</p>
            {error.limit && (
              <p>Limit: {error.limit} requests, Remaining: {error.remaining || 0}</p>
            )}
          </div>
        </div>
      );
    }

    if (error.error?.includes('FILE_TOO_LARGE')) {
      return (
        <div className="space-y-2">
          <p>{error.message}</p>
          <div className="text-sm text-muted-foreground">
            <p>Maximum file size allowed: {error.maxSize || 50}MB</p>
            <p>Try compressing your log file or splitting it into smaller chunks.</p>
          </div>
        </div>
      );
    }

    if (error.error?.includes('INVALID_FILE_TYPE')) {
      return (
        <div className="space-y-2">
          <p>{error.message}</p>
          <div className="text-sm text-muted-foreground">
            <p>Allowed file types: {error.allowedTypes?.join(', ') || '.txt, .log'}</p>
            <p>Make sure your file has the correct extension and contains valid log data.</p>
          </div>
        </div>
      );
    }

    return error.message;
  };

  const canRetry = () => {
    // Don't show retry for file type errors or validation errors
    if (error.error?.includes('INVALID_FILE_TYPE') || error.error?.includes('VALIDATION')) {
      return false;
    }
    return true;
  };

  return (
    <Alert variant={getErrorColor()} className="mb-4">
      {getErrorIcon()}
      <AlertTitle>{getErrorTitle()}</AlertTitle>
      <AlertDescription>
        <div className="mt-2">
          {getHelpfulMessage()}
          
          {error.details && process.env.NODE_ENV === 'development' && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 mt-3">
            {canRetry() && onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                disabled={error.retryAfter && error.retryAfter > 0}
              >
                {error.retryAfter && error.retryAfter > 0 ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Retry in {error.retryAfter}s
                  </>
                ) : (
                  'Try Again'
                )}
              </Button>
            )}
            
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface RateLimitInfoProps {
  className?: string;
}

export function RateLimitInfo({ className }: RateLimitInfoProps) {
  return (
    <div className={`text-sm text-muted-foreground space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3" />
        <span className="font-medium">Rate Limits:</span>
      </div>
      <ul className="space-y-1 ml-5 text-xs">
        <li>• File uploads: 10 per 15 minutes</li>
        <li>• AI analysis: 20 per 5 minutes</li>
        <li>• API requests: 100 per 15 minutes</li>
        <li>• Login attempts: 5 per 15 minutes</li>
      </ul>
      <div className="flex items-center gap-2 mt-2">
        <Upload className="h-3 w-3" />
        <span className="font-medium">File Limits:</span>
      </div>
      <ul className="space-y-1 ml-5 text-xs">
        <li>• Maximum size: 50MB</li>
        <li>• Maximum entries: 100,000 per file</li>
        <li>• Allowed types: .txt, .log</li>
      </ul>
    </div>
  );
}