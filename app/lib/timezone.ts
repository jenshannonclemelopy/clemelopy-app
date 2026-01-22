/**
 * Clemelopy Timezone Utilities
 * 
 * Handles timezone detection, storage, and conversions for reminders/notifications
 */

// Common timezones grouped by region
export const TIMEZONE_OPTIONS = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (CT)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'North America' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', region: 'North America' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', region: 'North America' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)', region: 'North America' },
  { value: 'America/Toronto', label: 'Toronto (ET)', region: 'North America' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)', region: 'North America' },
  { value: 'America/Mexico_City', label: 'Mexico City (CT)', region: 'North America' },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET)', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (EET)', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', region: 'Europe' },
  
  // Asia & Pacific
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia & Pacific' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', region: 'Asia & Pacific' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia & Pacific' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia & Pacific' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia & Pacific' },
  { value: 'Asia/Taipei', label: 'Taipei (CST)', region: 'Asia & Pacific' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', region: 'Asia & Pacific' },
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB)', region: 'Asia & Pacific' },
  { value: 'Asia/Manila', label: 'Manila (PHT)', region: 'Asia & Pacific' },
  { value: 'Asia/Kolkata', label: 'India (IST)', region: 'Asia & Pacific' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Asia & Pacific' },
  { value: 'Asia/Tel_Aviv', label: 'Tel Aviv (IST)', region: 'Asia & Pacific' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', region: 'Asia & Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)', region: 'Asia & Pacific' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Asia & Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', region: 'Asia & Pacific' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', region: 'South America' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', region: 'South America' },
  { value: 'America/Santiago', label: 'Santiago (CLT)', region: 'South America' },
  { value: 'America/Bogota', label: 'Bogotá (COT)', region: 'South America' },
  { value: 'America/Lima', label: 'Lima (PET)', region: 'South America' },
  
  // Africa & Middle East
  { value: 'Africa/Cairo', label: 'Cairo (EET)', region: 'Africa & Middle East' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', region: 'Africa & Middle East' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', region: 'Africa & Middle East' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', region: 'Africa & Middle East' },
];

/**
 * Detect the user's timezone from the browser
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // Fallback
  }
}

/**
 * Get the current UTC offset for a timezone (e.g., "-05:00" or "+09:00")
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Get a human-readable label for a timezone with current offset
 */
export function getTimezoneLabel(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find(tz => tz.value === timezone);
  const offset = getTimezoneOffset(timezone);
  
  if (option) {
    return `${option.label} (${offset})`;
  }
  
  return `${timezone} (${offset})`;
}

/**
 * Convert a local date/time string to UTC ISO string, respecting the user's timezone
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format (optional, defaults to 09:00)
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns ISO string in UTC
 */
export function localToUTC(dateStr: string, timeStr: string | null, timezone: string): string {
  const time = timeStr || '09:00';
  const localDateTimeStr = `${dateStr}T${time}:00`;
  
  // Create a date object and format it in the target timezone to get the offset
  const date = new Date(localDateTimeStr);
  
  // Get the offset for the target timezone at the given date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Parse the formatted date to reconstruct in UTC
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');
  
  // Now we need to figure out the actual UTC time
  // Create dates in both local browser time and the target timezone
  const targetDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  
  // Calculate the difference and adjust
  // This is a simplified approach - for production, consider using a library like date-fns-tz
  const tempDate = new Date(localDateTimeStr);
  const localOffset = tempDate.getTimezoneOffset() * 60000;
  
  // Get timezone offset by comparing
  const tzFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Create a reference point
  const refDate = new Date(`${dateStr}T${time}:00Z`);
  const tzString = tzFormatter.format(refDate);
  const [tzDatePart, tzTimePart] = tzString.split(', ');
  const reconstructed = new Date(`${tzDatePart}T${tzTimePart}:00Z`);
  
  // The difference tells us the timezone offset
  const tzOffset = reconstructed.getTime() - refDate.getTime();
  
  // Apply the inverse offset to get UTC
  const utcDate = new Date(tempDate.getTime() - localOffset + tzOffset);
  
  return utcDate.toISOString();
}

/**
 * Simpler approach: Store local time + timezone, let the server handle conversion
 * Returns an object with the local datetime and timezone for storage
 */
export function createTimezoneAwareReminder(
  dateStr: string, 
  timeStr: string | null, 
  timezone: string
): { localDateTime: string; timezone: string; utcEstimate: string } {
  const time = timeStr || '09:00';
  const localDateTime = `${dateStr}T${time}:00`;
  
  // Also provide a UTC estimate for the server to use
  // The server should recalculate this using the timezone for accuracy
  const localDate = new Date(localDateTime);
  const utcEstimate = localDate.toISOString();
  
  return {
    localDateTime,
    timezone,
    utcEstimate,
  };
}

/**
 * Calculate reminder time based on due date/time and reminder setting
 * Returns both local and UTC representations
 */
export function calculateReminderTime(
  dueDate: string,
  dueTime: string | null,
  reminderType: string,
  customReminderDateTime: string | null,
  timezone: string
): { reminderAt: string; reminderTimezone: string; reminderLocalTime: string } | null {
  if (reminderType === 'none' || !dueDate) {
    return null;
  }
  
  // For custom reminders, use the provided datetime directly
  if (reminderType === 'custom' && customReminderDateTime) {
    return {
      reminderAt: new Date(customReminderDateTime).toISOString(),
      reminderTimezone: timezone,
      reminderLocalTime: customReminderDateTime,
    };
  }
  
  // Calculate based on due date/time
  const time = dueTime || '09:00';
  const dueDateTime = new Date(`${dueDate}T${time}:00`);
  
  let reminderDate: Date;
  
  switch (reminderType) {
    case '15min':
      reminderDate = new Date(dueDateTime.getTime() - 15 * 60 * 1000);
      break;
    case '30min':
      reminderDate = new Date(dueDateTime.getTime() - 30 * 60 * 1000);
      break;
    case '1hour':
      reminderDate = new Date(dueDateTime.getTime() - 60 * 60 * 1000);
      break;
    case '2hours':
      reminderDate = new Date(dueDateTime.getTime() - 2 * 60 * 60 * 1000);
      break;
    case '1day':
      reminderDate = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '2days':
      reminderDate = new Date(dueDateTime.getTime() - 2 * 24 * 60 * 60 * 1000);
      break;
    case '1week':
      reminderDate = new Date(dueDateTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      return null;
  }
  
  // Format local time for display
  const reminderLocalTime = reminderDate.toISOString().slice(0, 16);
  
  return {
    reminderAt: reminderDate.toISOString(),
    reminderTimezone: timezone,
    reminderLocalTime,
  };
}

/**
 * Format a UTC datetime for display in a specific timezone
 */
export function formatInTimezone(
  utcDateString: string, 
  timezone: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcDateString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Check if a reminder time is in the past (for the given timezone)
 */
export function isReminderInPast(reminderAt: string, timezone: string): boolean {
  const reminderDate = new Date(reminderAt);
  const now = new Date();
  return reminderDate < now;
}

/**
 * Get the current time in a specific timezone as a formatted string
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  return new Date().toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Validate that a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get grouped timezone options for a select dropdown
 */
export function getGroupedTimezones(): { region: string; timezones: typeof TIMEZONE_OPTIONS }[] {
  const regions = [...new Set(TIMEZONE_OPTIONS.map(tz => tz.region))];
  
  return regions.map(region => ({
    region,
    timezones: TIMEZONE_OPTIONS.filter(tz => tz.region === region),
  }));
}
