import { LogEntry } from "./anomaly-detector";

export class ZscalerLogParser {
  parseLogFile(content: string): LogEntry[] {
    const lines = content.split('\n').filter(line => line.trim());
    const entries: LogEntry[] = [];
    let successfulParsed = 0;

    for (const line of lines) {
      try {
        const entry = this.parseZscalerLogLine(line);
        if (entry) {
          entries.push(entry);
          successfulParsed++;
        }
      } catch (error) {
        console.warn("Failed to parse log line:", line.substring(0, 100), error);
      }
    }

    const parseRate = lines.length > 0 ? (successfulParsed / lines.length) * 100 : 0;
    console.log(`Parsed ${successfulParsed}/${lines.length} lines (${parseRate.toFixed(1)}%)`);

    if (parseRate < 50) {
      throw new Error(`Only ${parseRate.toFixed(1)}% of lines could be parsed. Check file format.`);
    }

    return entries;
  }

  private parseZscalerLogLine(line: string): LogEntry | null {
    // Zscaler NSS feed format parsing with multiple delimiter support
    // Handle pipe-delimited, tab-separated, and CSV formats

    let fields: string[];
    
    if (line.includes('|')) {
      // Pipe-delimited format
      fields = line.split('|');
    } else if (line.includes(';')) {
      // Semicolon-delimited format
      fields = line.split(';');
    } else if (line.includes('\t')) {
      // Tab-separated format
      fields = line.split('\t');
    } else {
      // CSV format with potential quoted fields
      fields = this.parseCSVLine(line);
    }
    
    if (fields.length < 10) {
      return null; // Not enough fields for a valid Zscaler log
    }

    // Clean up quoted fields
    fields = fields.map(field => field.replace(/^"/, '').replace(/"$/, '').trim());

    // Auto-detect format and map fields accordingly
    let timestamp, sourceIP, destinationIP, url, action, statusCode, userAgent, category, bytes;

    if ((line.includes('|') || line.includes(';')) && fields.length >= 9) {
      // Pipe/Semicolon-delimited format: TimeStamp|SourceIP|DestinationIP|URL|Action|StatusCode|User-Agent|Bytes Sent|Duration
      timestamp = fields[0]?.trim();
      sourceIP = fields[1]?.trim();
      destinationIP = fields[2]?.trim();
      url = fields[3]?.trim();
      action = fields[4]?.trim() || 'unknown';
      statusCode = fields[5]?.trim();
      userAgent = fields[6]?.trim();
      bytes = parseInt(fields[7]?.trim()) || 0;
      category = fields.length > 8 ? fields[8]?.trim() : undefined;
    } else {
      // Original CSV format: timestamp,department,protocol,url,action,category,subcategory,...
      timestamp = fields[0]?.trim();
      const department = fields[1]?.trim();
      const protocol = fields[2]?.trim();
      url = fields[3]?.trim();
      action = fields[4]?.trim() || 'unknown';
      category = fields[5]?.trim();
      const subcategory = fields[6]?.trim();
      const clientIP = fields[21]?.trim(); // user field
      sourceIP = fields[22]?.trim(); // client_ip
      destinationIP = fields[23]?.trim(); // server_ip  
      const method = fields[24]?.trim();
      statusCode = fields[25]?.trim();
      userAgent = fields[26]?.trim();
      bytes = parseInt(fields[7]?.trim()) || 0;
    }

    if (!timestamp) {
      return null;
    }

    return {
      timestamp: this.normalizeTimestamp(timestamp),
      sourceIP: sourceIP || 'unknown',
      destinationIP: destinationIP,
      user: undefined, // Will be extracted from context if needed
      action,
      url: url || undefined,
      statusCode: statusCode || undefined,
      bytes: bytes > 0 ? bytes : undefined,
      userAgent: userAgent || undefined,
      protocol: undefined,
      category: category || undefined,
      subcategory: undefined,
      rawLog: line,
    };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current); // Add the last field
    return result;
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
