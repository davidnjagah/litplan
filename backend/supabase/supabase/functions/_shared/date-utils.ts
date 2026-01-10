/**
 * Shared date utilities for plan/event storage
 * Ensures weekday is always calculated from the actual date
 */

/**
 * Get the weekday name from a date string (YYYY-MM-DD format)
 * Uses UTC to avoid timezone issues
 */
export function getWeekdayFromDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00Z'); // Use noon UTC to avoid date boundary issues
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 * Uses UTC to avoid timezone issues
 */
export function isWeekendDate(dateString: string): boolean {
  const date = new Date(dateString + 'T12:00:00Z');
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the next occurrence of a specific weekday from today
 * @param targetWeekday - The day name (e.g., 'Saturday', 'Friday')
 * @returns Date string in YYYY-MM-DD format
 */
export function getNextWeekday(targetWeekday: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIndex = days.findIndex(d => d.toLowerCase() === targetWeekday.toLowerCase());

  if (targetIndex === -1) {
    // Invalid weekday, return today
    return getTodayDateString();
  }

  const today = new Date();
  const todayIndex = today.getUTCDay();

  // Calculate days until target weekday
  let daysUntil = targetIndex - todayIndex;
  if (daysUntil <= 0) {
    daysUntil += 7; // Next week
  }

  const targetDate = new Date(today);
  targetDate.setUTCDate(today.getUTCDate() + daysUntil);

  return targetDate.toISOString().split('T')[0];
}
