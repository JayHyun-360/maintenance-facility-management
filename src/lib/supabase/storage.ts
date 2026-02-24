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
        console.log(`Storage: Getting item for key: ${key}`);

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

        console.log(`Storage: Retrieved value:`, value ? "exists" : "null");
        return value;
      } catch (error) {
        console.error("Storage: getItem error:", error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        console.log(`Storage: Setting item for key: ${key}`);

        // Store PKCE verifiers in sessionStorage
        if (key.includes("pkce") || key.includes("verifier")) {
          sessionStorage.setItem(key, value);
        } else {
          // For other items, use sessionStorage as fallback
          sessionStorage.setItem(key, value);
        }

        console.log(`Storage: Successfully set item`);
      } catch (error) {
        console.error("Storage: setItem error:", error);
      }
    },
    removeItem: (key: string) => {
      try {
        console.log(`Storage: Removing item for key: ${key}`);
        sessionStorage.removeItem(key);
        console.log(`Storage: Successfully removed item`);
      } catch (error) {
        console.error("Storage: removeItem error:", error);
      }
    },
  };
};
