// Enhanced storage implementation to handle PKCE verifier persistence
// This ensures that Supabase can store and retrieve PKCE code verifier and session data

export const createCustomStorage = () => {
  if (typeof window === "undefined") {
    // Server-side storage - no-op
    return {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {},
    };
  }

  return {
    getItem: (key: string) => {
      try {
        // Try sessionStorage first (for PKCE verifier)
        let value = sessionStorage.getItem(key);

        // If not found in sessionStorage, try to extract from cookies for session data
        if (!value && (key.includes("session") || key.includes("auth"))) {
          const cookies = document.cookie.split(";");
          for (const cookie of cookies) {
            const [cookieKey, cookieValue] = cookie.trim().split("=");
            if (cookieKey === key || cookieKey.includes(key)) {
              value = decodeURIComponent(cookieValue);
              break;
            }
          }
        }

        return value;
      } catch (error) {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        // Store PKCE verifiers in sessionStorage
        if (key.includes("pkce") || key.includes("verifier")) {
          sessionStorage.setItem(key, value);
        } else {
          // For other items, use sessionStorage as fallback
          sessionStorage.setItem(key, value);
        }
      } catch (error) {
        // Silent fail for storage operations
      }
    },
    removeItem: (key: string) => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        // Silent fail for storage operations
      }
    },
  };
};
