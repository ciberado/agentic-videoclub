import { EventEmitter } from 'events';
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

import { watch } from 'chokidar';

import { LogEvent } from '../../shared/types';

export class LogWatcher extends EventEmitter {
  private watcher: any = null;
  private logFilePath: string;
  private lastPosition: number = 0;

  constructor() {
    super();
    // Point to the agentic package's log directory
    this.logFilePath = path.join(__dirname, '../../../../agentic/logs');
  }

  startWatching(): void {
    if (!existsSync(this.logFilePath)) {
      console.warn(`Log directory not found: ${this.logFilePath}`);
      return;
    }

    // Watch for new log files and changes to existing ones
    this.watcher = watch(this.logFilePath, {
      ignored: /^\./,
      persistent: true,
    });

    this.watcher
      .on('add', (filePath: string) => this.handleLogFile(filePath))
      .on('change', (filePath: string) => this.handleLogFile(filePath))
      .on('error', (error: Error) => {
        console.error('Log watcher error:', error);
        this.emit('error', error);
      });

    console.log(`Started watching logs at: ${this.logFilePath}`);
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.lastPosition = 0;
    }
  }

  private handleLogFile(filePath: string): void {
    // Only process .jsonl files (Winston JSON logs)
    if (!filePath.endsWith('.jsonl')) {
      return;
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Process new lines since last read
      const newLines = lines.slice(this.lastPosition);
      this.lastPosition = lines.length - 1; // -1 to account for potential empty last line

      for (const line of newLines) {
        if (line.trim()) {
          try {
            const logEntry = JSON.parse(line);
            const logEvent: LogEvent = {
              timestamp: logEntry.timestamp || new Date().toISOString(),
              level: logEntry.level || 'info',
              message: logEntry.message || '',
              nodeId: logEntry.nodeId,
              details: logEntry.details || logEntry,
            };

            this.emit('log_event', logEvent);
          } catch (parseError) {
            console.warn('Failed to parse log line:', line, parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error reading log file:', error);
    }
  }

  // Method to get recent log entries for initial load
  getRecentLogs(maxLines: number = 100): LogEvent[] {
    const logs: LogEvent[] = [];

    try {
      if (!existsSync(this.logFilePath)) {
        return logs;
      }

      // Find the most recent log file
      const files = readdirSync(this.logFilePath)
        .filter((file: string) => file.endsWith('.jsonl'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return logs;
      }

      const latestFile = path.join(this.logFilePath, files[0]);
      const content = readFileSync(latestFile, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());

      // Get last N lines
      const recentLines = lines.slice(-maxLines);

      for (const line of recentLines) {
        try {
          const logEntry = JSON.parse(line);
          logs.push({
            timestamp: logEntry.timestamp || new Date().toISOString(),
            level: logEntry.level || 'info',
            message: logEntry.message || '',
            nodeId: logEntry.nodeId,
            details: logEntry.details || logEntry,
          });
        } catch (_parseError) {
          console.warn('Failed to parse log line:', line, _parseError);
        }
      }
    } catch (error) {
      console.error('Error getting recent logs:', error);
    }

    return logs;
  }
}
