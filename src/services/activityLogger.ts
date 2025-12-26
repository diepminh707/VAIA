/**
 * Activity Logger Service
 * Manages activity log entries with severity levels
 */

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

export interface Activity {
  timestamp: string;
  message: string;
  severity: ActivitySeverity;
}

export class ActivityLoggerService {
  private static instance: ActivityLoggerService;
  private activities: Activity[] = [];
  private maxActivities: number = 50;
  private listeners: Array<(activities: Activity[]) => void> = [];

  private constructor() {}

  static getInstance(): ActivityLoggerService {
    if (!ActivityLoggerService.instance) {
      ActivityLoggerService.instance = new ActivityLoggerService();
    }
    return ActivityLoggerService.instance;
  }

  /**
   * Add a new activity to the log
   */
  log(message: string, severity: ActivitySeverity = 'info'): void {
    const activity: Activity = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      severity,
    };

    this.activities = [activity, ...this.activities].slice(0, this.maxActivities);
    this.notifyListeners();
  }

  /**
   * Log success message
   */
  success(message: string): void {
    this.log(message, 'success');
  }

  /**
   * Log info message
   */
  info(message: string): void {
    this.log(message, 'info');
  }

  /**
   * Log warning message
   */
  warning(message: string): void {
    this.log(message, 'warning');
  }

  /**
   * Log error message
   */
  error(message: string): void {
    this.log(message, 'error');
  }

  /**
   * Get all activities
   */
  getActivities(): Activity[] {
    return [...this.activities];
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
    this.notifyListeners();
  }

  /**
   * Subscribe to activity changes
   */
  subscribe(listener: (activities: Activity[]) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getActivities()));
  }

  /**
   * Set maximum number of activities to keep
   */
  setMaxActivities(max: number): void {
    this.maxActivities = max;
    if (this.activities.length > max) {
      this.activities = this.activities.slice(0, max);
      this.notifyListeners();
    }
  }
}

// Export singleton instance
export const activityLogger = ActivityLoggerService.getInstance();
