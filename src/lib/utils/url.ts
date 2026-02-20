/**
 * Get the base URL for the application
 * Handles both local development and production environments
 */
export function getURL() {
  const isLocal = process.env.NODE_ENV === 'development'
  
  if (isLocal) {
    return 'http://localhost:3000'
  }
  
  // Production: use environment variable or fallback to Vercel URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Fallback for maintenance-facility-management.vercel.app
  return 'https://maintenance-facility-management.vercel.app'
}

/**
 * Get the auth callback URL
 */
export function getAuthCallbackURL(next?: string) {
  const baseURL = getURL()
  const callbackPath = '/auth/callback'
  const queryString = next ? `?next=${encodeURIComponent(next)}` : ''
  
  return `${baseURL}${callbackPath}${queryString}`
}
