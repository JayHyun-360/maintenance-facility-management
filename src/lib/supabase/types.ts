// Supabase User type definitions
// These are the actual types from @supabase/ssr

export interface User {
  id: string
  app_metadata?: { [key: string]: any }
  aud?: string
  created_at: string
  email?: string
  email_confirmed_at?: string
  email_confirmed?: boolean
  full_name?: string
  iss?: string
  name?: string
  phone?: string
  phone_confirmed_at?: string
  phone_confirmed?: boolean
  picture?: string
  provider?: string
  providers?: string[]
  raw_user_meta_data?: { [key: string]: any }
  role?: string
  updated_at?: string
  user_metadata?: { [key: string]: any }
  last_sign_in_at?: string
}

export interface Session {
  access_token: string
  refresh_token?: string
  expires_at?: number
  expires_in?: number
  provider?: string
  provider_token?: string
  token_type: string
  user: User
}
