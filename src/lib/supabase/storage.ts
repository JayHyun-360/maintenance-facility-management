// Custom storage implementation to handle PKCE verifier persistence
// This ensures the PKCE code verifier is available across OAuth redirects

export const createCustomStorage = () => {
  if (typeof window === 'undefined') {
    // Server-side storage - no-op
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  // Use sessionStorage for PKCE (survives page reloads within session)
  return {
    getItem: (key: string) => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // Silently fail if sessionStorage is not available
      }
    },
    removeItem: (key: string) => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Silently fail if sessionStorage is not available
      }
    },
  };
};
