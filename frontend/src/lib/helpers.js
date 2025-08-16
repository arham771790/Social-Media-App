/**
 * Format date for display (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now - past) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`
  }
  
  // For older dates, show actual date
  return past.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format number with K/M suffixes (e.g., 1.2K, 3.4M)
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num < 1000) {
    return num.toString()
  }
  
  if (num < 1000000) {
    const formatted = (num / 1000).toFixed(1)
    return `${formatted.endsWith('.0') ? Math.floor(num / 1000) : formatted}K`
  }
  
  const formatted = (num / 1000000).toFixed(1)
  return `${formatted.endsWith('.0') ? Math.floor(num / 1000000) : formatted}M`
}

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Check if file is an image
 * @param {File} file - File to check
 * @returns {boolean} Whether file is an image
 */
export function isImageFile(file) {
  return file && file.type.startsWith('image/')
}

/**
 * Check if file is a video
 * @param {File} file - File to check
 * @returns {boolean} Whether file is a video
 */
export function isVideoFile(file) {
  return file && file.type.startsWith('video/')
}

/**
 * Generate a random string ID
 * @param {number} length - Length of ID
 * @returns {string} Random string
 */
export function generateId(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * Handle API response and extract data or throw error
 * @param {Response} response - Fetch response
 * @returns {Promise<any>} Response data
 */
export async function handleApiResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}