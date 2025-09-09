import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to show both date and time in a user-friendly format
 * This function is backward compatible and assumes dates are already in local timezone
 * For new timezone-aware functionality, use formatUTCToLocal instead
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  // Check if the date has time information (not just midnight)
  const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;
  
  if (hasTime) {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } else {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Format a UTC date to show both date and time in local timezone
 * This is the new timezone-aware version of formatDateTime
 */
export function formatDateTimeUTC(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  // Check if the date has time information (not just midnight)
  const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;
  
  if (hasTime) {
    return formatUTCToLocal(dateObj, 'PPP p');
  } else {
    return formatUTCToLocal(dateObj, 'PPP');
  }
}

/**
 * Format a date to show only the time
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Generate unique 6-character enrollment code
export function generateEnrollmentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique enrollment codes for sections
export function generateSectionEnrollmentCodes(): { professorCode: string; studentCode: string } {
  const professorCode = generateEnrollmentCode();
  // Generate student code with 'S' suffix to ensure uniqueness
  const studentCode = generateEnrollmentCode() + 'S';
  return { professorCode, studentCode };
}

/**
 * Convert a local date/time to UTC for database storage
 * @param localDate - Date object in local timezone
 * @param timezone - Timezone string (e.g., 'America/New_York'). If not provided, uses browser timezone
 * @returns Date object in UTC
 */
export function toUTC(localDate: Date, timezone?: string): Date {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return fromZonedTime(localDate, tz);
}

/**
 * Convert a UTC date from database to local timezone for display
 * @param utcDate - Date object in UTC
 * @param timezone - Timezone string (e.g., 'America/New_York'). If not provided, uses browser timezone
 * @returns Date object in local timezone
 */
export function fromUTC(utcDate: Date, timezone?: string): Date {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return toZonedTime(utcDate, tz);
}

/**
 * Format a UTC date for display in local timezone
 * @param utcDate - Date object in UTC
 * @param format - Format string (default: 'PPP p')
 * @param timezone - Timezone string. If not provided, uses browser timezone
 * @returns Formatted date string in local timezone
 */
export function formatUTCToLocal(utcDate: Date | string | null | undefined, format: string = 'PPP p', timezone?: string): string {
  if (!utcDate) return 'Not set';
  
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatTz(toZonedTime(dateObj, tz), format, { timeZone: tz });
}

/**
 * Create a date from local date/time strings and convert to UTC
 * @param dateString - Date string (YYYY-MM-DD)
 * @param timeString - Time string (HH:MM)
 * @param timezone - Timezone string. If not provided, uses browser timezone
 * @returns Date object in UTC
 */
export function createUTCDateFromLocal(dateString: string, timeString: string, timezone?: string): Date {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDateTime = new Date(`${dateString}T${timeString}:00`);
  return fromZonedTime(localDateTime, tz);
}

/**
 * Extract quiz metadata from description field
 * @param description - Quiz description that may contain metadata
 * @returns Object with quiz metadata or default values
 */
export function extractQuizMetadata(description: string | null | undefined): { hideFeedbackAfterDue: boolean } {
  if (!description) return { hideFeedbackAfterDue: false };
  
  const metadataMatch = description.match(/<!-- QUIZ_METADATA: ({.*?}) -->/);
  if (metadataMatch) {
    try {
      return JSON.parse(metadataMatch[1]);
    } catch (error) {
      console.error('Error parsing quiz metadata:', error);
      return { hideFeedbackAfterDue: false };
    }
  }
  
  return { hideFeedbackAfterDue: false };
}

/**
 * Check if feedback should be hidden for students based on quiz settings and due date
 * @param quiz - Quiz object with endDate and description
 * @param userRole - User role (STUDENT, PROFESSOR, ADMIN)
 * @returns true if feedback should be hidden for students, false otherwise
 */
export function shouldHideFeedbackForStudent(quiz: { endDate: Date | null; description: string | null }, userRole: string): boolean {
  // Admins and professors always see full feedback
  if (userRole === 'ADMIN' || userRole === 'PROFESSOR') return false;
  
  const metadata = extractQuizMetadata(quiz.description);
  
  // If hideFeedbackAfterDue is not enabled, always show feedback
  if (!metadata.hideFeedbackAfterDue) return false;
  
  // If no due date is set, always show feedback
  if (!quiz.endDate) return false;
  
  // For students: hide feedback BEFORE due date, show it AFTER due date
  const now = new Date();
  const dueDate = new Date(quiz.endDate);
  
  return now <= dueDate;
}
