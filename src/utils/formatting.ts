export const formatting = {
  currency: (value: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  },

  number: (value: number, decimals = 2): string => {
    return value.toFixed(decimals)
  },

  percentage: (value: number, decimals = 1): string => {
    return `${value.toFixed(decimals)}%`
  },

  squareFootage: (value: number): string => {
    return `${value.toLocaleString()} sq ft`
  },

  truncate: (text: string, length: number): string => {
    return text.length > length ? text.substring(0, length) + '...' : text
  },

  capitalizeFirst: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1)
  },

  slug: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
  },
}
