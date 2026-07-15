/**
 * Date formatting utilities
 * Provides consistent date formatting across the application.
 */

const MONTH_ABBREVIATIONS: Record<number, string> = {
  0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
  6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
}

/**
 * Format a date string to DD/MMM/YYYY format (e.g., "08/Nov/2026")
 * Returns 'TBA' if the date is null/undefined/empty
 */
export function formatDateDDMMMYYYY(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'TBA'
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    
    if (isNaN(date.getTime())) return 'TBA'
    
    const day = String(date.getDate()).padStart(2, '0')
    const month = MONTH_ABBREVIATIONS[date.getMonth()]
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  } catch {
    return 'TBA'
  }
}

/**
 * Format a date string to DD/MM/YYYY format (e.g., "08/11/2026")
 * Returns 'TBA' if the date is null/undefined/empty
 */
export function formatDateDDMMYYYY(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'TBA'
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    
    if (isNaN(date.getTime())) return 'TBA'
    
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  } catch {
    return 'TBA'
  }
}

/**
 * Parse a date string (from a date input field in YYYY-MM-DD format) 
 * and return a formatted display string.
 * Used to show the user-friendly format next to date inputs.
 */
export function displayDateFromInput(dateInputValue: string | null | undefined): string {
  if (!dateInputValue) return ''
  return formatDateDDMMYYYY(dateInputValue)
}
