// Email validation utility
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get high-resolution Google profile picture
// Google avatars by default are small (around 96px). Adding =sXXX-c gets a larger version.
export const getHighResGoogleAvatar = (
  avatarUrl: string | null | undefined,
  size: number = 512,
): string => {
  if (!avatarUrl) return "";

  // Check if it's a Google profile picture (lh3.googleusercontent.com)
  if (avatarUrl.includes("lh3.googleusercontent.com")) {
    // Remove any existing size parameters and add new high-res parameter
    const baseUrl = avatarUrl.split("=")[0];
    return `${baseUrl}=s${size}-c`;
  }

  return avatarUrl;
};

// Domain validation for admin detection
export const isValidDomain = (domain: string): boolean => {
  if (!domain || typeof domain !== "string") return false;

  // Basic domain regex pattern
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
};

// Sanitize email input
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Extract domain from email
export const extractDomain = (email: string): string | null => {
  const sanitizedEmail = sanitizeEmail(email);
  const parts = sanitizedEmail.split("@");

  if (parts.length !== 2 || !isValidEmail(sanitizedEmail)) {
    return null;
  }

  return parts[1];
};
