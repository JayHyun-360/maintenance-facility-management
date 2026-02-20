"use server";

// Re-export all auth actions from a single entry point
// This ensures proper server action bundling for Vercel deployment

export {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  signInAsGuest,
  signOut,
  completeProfile,
  getAllProfiles,
  getUserProfile,
} from "./auth";

// Log that server actions are being loaded
console.log("🔧 Server actions loaded successfully");
