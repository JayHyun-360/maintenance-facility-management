// Custom storage implementation to handle PKCE verifier persistence
// This ensures that Supabase can store and retrieve PKCE code verifier

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
        const value = sessionStorage.getItem(key);
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
        sessionStorage.setItem(key, value);
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
