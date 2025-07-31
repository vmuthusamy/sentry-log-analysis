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
    // Zscaler NSS feed format parsing with quoted CSV support
    // Handle both comma-separated and tab-separated formats, including quoted fields

    let fields: string[];
    
    if (line.includes('\t')) {
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

    // Map fields based on actual Zscaler NSS format
    // Fields: timestamp,department,protocol,url,action,category,subcategory,bytes_out,bytes_in,upload_bytes,download_bytes,threat_category,threat_name,rule_type,policy,dpi_category,dpi_count,dpi_rule,dpi_engine,location,user,client_ip,server_ip,method,status_code,user_agent,ssl_decryption,url_category,app_name,app_type,content_type,http_transaction_method,reason,md5_hash
    const timestamp = fields[0]?.trim();
    const department = fields[1]?.trim();
    const protocol = fields[2]?.trim();
    const url = fields[3]?.trim();
    const action = fields[4]?.trim() || 'unknown';
    const category = fields[5]?.trim();
    const subcategory = fields[6]?.trim();
    const clientIP = fields[21]?.trim(); // user field
    const serverIP = fields[22]?.trim(); // client_ip
    const realServerIP = fields[23]?.trim(); // server_ip  
    const method = fields[24]?.trim();
    const statusCode = fields[25]?.trim();
    const userAgent = fields[26]?.trim();
    const bytes = parseInt(fields[7]?.trim()) || 0;

    if (!timestamp) {
      return null;
    }

    return {
      timestamp: this.normalizeTimestamp(timestamp),
      sourceIP: serverIP || 'unknown', // client_ip (field 22)
      destinationIP: realServerIP,      // server_ip (field 23)
      user: clientIP || department || undefined, // user field (field 21) or department
      action,
      url: url || undefined,
      statusCode: statusCode || undefined,
      bytes: bytes > 0 ? bytes : undefined,
      userAgent: userAgent || undefined,
      protocol: protocol || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
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
