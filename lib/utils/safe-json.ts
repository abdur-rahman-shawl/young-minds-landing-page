/**
 * Safely parses JSON with fallback handling for different data formats
 */
export function safeJsonParse(value: string | null | undefined, fallback: any[] = []): any[] {
  if (!value) return fallback;
  
  // If it's already an array, return it
  if (Array.isArray(value)) return value;
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's a single value, wrap it in an array
    return [parsed];
  } catch (error) {
    // If JSON parsing fails, try splitting by common delimiters
    if (typeof value === 'string') {
      // Try comma separation first
      if (value.includes(',')) {
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
      
      // Try semicolon separation
      if (value.includes(';')) {
        return value.split(';').map(item => item.trim()).filter(item => item.length > 0);
      }
      
      // Try pipe separation
      if (value.includes('|')) {
        return value.split('|').map(item => item.trim()).filter(item => item.length > 0);
      }
      
      // If no delimiters found and it's not empty, treat as single item
      if (value.trim().length > 0) {
        return [value.trim()];
      }
    }
    
    // Return fallback if all else fails
    return fallback;
  }
}

/**
 * Safely parses expertise/skills data with specific handling for common formats
 */
export function parseExpertise(expertise: string | null | undefined): string[] {
  return safeJsonParse(expertise, []);
}

/**
 * Safely stringifies data for storage
 */
export function safeJsonStringify(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  } catch (error) {
    console.warn('Failed to stringify value:', error);
    return fallback;
  }
}

/**
 * Validates if a string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}