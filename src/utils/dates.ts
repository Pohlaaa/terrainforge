/**
 * Returns an array of YYYY-MM-DD strings for each weekday (Mon-Fri)
 * between start and end (inclusive). Capped at 60 days to prevent runaway loops.
 */
export function getWeekdaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const current = new Date(startDate);
  const maxDays = 60;
  let count = 0;

  while (current <= endDate && count < maxDays) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export const dateUtils = {
  format: (date: Date | string, format: 'short' | 'long' = 'short'): string => {
    const d = typeof date === 'string' ? new Date(date) : date

    if (format === 'short') {
      return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      })
    }

    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  },

  formatTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  },

  formatDateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return `${dateUtils.format(d, 'short')} ${dateUtils.formatTime(d)}`
  },

  daysUntil: (date: Date | string): number => {
    const d = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    const diff = d.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  },

  isPast: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d < new Date()
  },

  isFuture: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d > new Date()
  },

  isToday: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  },

  addDays: (date: Date | string, days: number): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date)
    d.setDate(d.getDate() + days)
    return d
  },
}
