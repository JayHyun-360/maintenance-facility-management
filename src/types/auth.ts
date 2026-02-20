// Database Roles (for access control)
export type DatabaseRole = 'Admin' | 'User'

// Visual Labels (for reporting/display only)
export type VisualRole = 'Teacher' | 'Staff' | 'Student'

// User profile type
export interface UserProfile {
  id: string
  name: string
  email?: string
  database_role: DatabaseRole
  visual_role?: VisualRole
  educational_level?: string
  department?: string
  created_at: string
  updated_at: string
}

// Guest user type (for anonymous auth)
export interface GuestUser {
  name: string
  visual_role: VisualRole
  educational_level?: string
  department?: string
}

// Auth context type
export interface AuthContextType {
  user: UserProfile | null
  guest: GuestUser | null
  isLoading: boolean
  isAdmin: boolean
  isUser: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAsGuest: (guestData: GuestUser) => Promise<void>
}
