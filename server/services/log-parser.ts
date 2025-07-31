import { LogEntry } from "./anomaly-detector";

export class ZscalerLogParser {
  parseLogFile(content: string): LogEntry[] {
    const lines = content.split('\n').filter(line => line.trim());
    const entries: LogEntry[] = [];

    for (const line of lines) {
      try {
        const entry = this.parseZscalerLogLine(line);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        console.warn("Failed to parse log line:", line, error);
      }
    }

    return entries;
  }

  private parseZscalerLogLine(line: string): LogEntry | null {
    // Zscaler NSS feed format parsing
    // Example format: timestamp,user,department,location_name,action,threatened_category,policy,clienttranstime,url,refererURL,useragent,reqmethod,respcode,reqsize,respsize,clientip,status,reason,threatcat,threatname,filetype,appname,appclass,dlpmd5,dlpdict,dlpdictnames,dlpengine,urlcat,malwarecat,bandwidth_throttle,dept,urlsupercat,devicename,devicetype,recordid

    // Handle both comma-separated and tab-separated formats
    const fields = line.includes('\t') ? line.split('\t') : line.split(',');
    
    if (fields.length < 10) {
      return null; // Not enough fields for a valid Zscaler log
    }

    // Map fields based on common Zscaler format
    const timestamp = fields[0]?.trim();
    const user = fields[1]?.trim();
    const action = fields[4]?.trim() || 'unknown';
    const url = fields[8]?.trim();
    const userAgent = fields[10]?.trim();
    const statusCode = fields[12]?.trim();
    const clientIP = fields[16]?.trim();
    const bytes = parseInt(fields[14]?.trim()) || 0;

    if (!timestamp || !clientIP) {
      return null;
    }

    return {
      timestamp: this.normalizeTimestamp(timestamp),
      sourceIP: clientIP,
      user: user || undefined,
      action,
      url: url || undefined,
      statusCode: statusCode || undefined,
      bytes: bytes > 0 ? bytes : undefined,
      userAgent: userAgent || undefined,
      rawLog: line,
    };
  }

  private normalizeTimestamp(timestamp: string): string {
    try {
      // Try to parse various timestamp formats
      let date: Date;
      
      if (timestamp.includes('T')) {
        // ISO format
        date = new Date(timestamp);
      } else if (timestamp.includes('/')) {
        // MM/DD/YYYY format
        date = new Date(timestamp);
      } else if (timestamp.match(/^\d{10}$/)) {
        // Unix timestamp (seconds)
        date = new Date(parseInt(timestamp) * 1000);
      } else if (timestamp.match(/^\d{13}$/)) {
        // Unix timestamp (milliseconds)
        date = new Date(parseInt(timestamp));
      } else {
        // Try parsing as-is
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }

      return date.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  validateLogFormat(content: string): { isValid: boolean; error?: string } {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { isValid: false, error: "File is empty" };
    }

    // Check if at least 50% of lines can be parsed
    let validLines = 0;
    const sampleSize = Math.min(lines.length, 100);
    
    for (let i = 0; i < sampleSize; i++) {
      const entry = this.parseZscalerLogLine(lines[i]);
      if (entry) {
        validLines++;
      }
    }

    const validPercentage = validLines / sampleSize;
    
    if (validPercentage < 0.5) {
      return { 
        isValid: false, 
        error: `Only ${Math.round(validPercentage * 100)}% of lines could be parsed. Expected Zscaler log format.`
      };
    }

    return { isValid: true };
  }

  getLogStats(entries: LogEntry[]): {
    totalEntries: number;
    uniqueIPs: number;
    uniqueUsers: number;
    timeRange: { start: string; end: string };
    topActions: { action: string; count: number }[];
  } {
    const uniqueIPs = new Set(entries.map(e => e.sourceIP)).size;
    const uniqueUsers = new Set(entries.map(e => e.user).filter(Boolean)).size;
    
    const timestamps = entries.map(e => new Date(e.timestamp)).sort();
    const timeRange = timestamps.length > 0 
      ? { start: timestamps[0].toISOString(), end: timestamps[timestamps.length - 1].toISOString() }
      : { start: '', end: '' };

    const actionCount = entries.reduce((acc, e) => {
      acc[e.action] = (acc[e.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      totalEntries: entries.length,
      uniqueIPs,
      uniqueUsers,
      timeRange,
      topActions,
    };
  }
}

export const zscalerLogParser = new ZscalerLogParser();
