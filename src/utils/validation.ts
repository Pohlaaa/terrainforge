/**
 * Formats a phone string as xxx-xxx-xxxx.
 * Strips all non-digit characters, then inserts dashes.
 * Returns the raw input if it doesn't have exactly 10 digits.
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
  }
  return digits;
}

export const validation = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)\.]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  },

  url: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max
  },

  required: (value: any): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return value !== null && value !== undefined
  },

  number: (value: any): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(value)
  },

  positive: (value: number): boolean => {
    return value > 0
  },

  integer: (value: number): boolean => {
    return Number.isInteger(value)
  },

  currency: (value: string): boolean => {
    const currencyRegex = /^\$?\d+\.?\d{0,2}$/
    return currencyRegex.test(value)
  },

  squareFootage: (value: number): boolean => {
    return value > 0 && Number.isInteger(value)
  },
}
