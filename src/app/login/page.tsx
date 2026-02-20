'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithGoogle, signUpWithEmail, signInWithEmail, signInAsGuest } from '@/actions/auth'
import { DatabaseRole, VisualRole, GuestUser } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Admin signup state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  
  // Admin login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  // Guest login state
  const [guestName, setGuestName] = useState('')
  const [guestVisualRole, setGuestVisualRole] = useState<VisualRole | null>(null)
  const [guestEducationLevel, setGuestEducationLevel] = useState('')
  const [guestDepartment, setGuestDepartment] = useState('')

  const handleGoogleSignIn = async (role: DatabaseRole) => {
    setLoading(true)
    setFormError(null)
    
    const result = await signInWithGoogle(role === 'Admin' ? '/admin/dashboard' : '/dashboard')
    
    if (result.error) {
      setFormError(result.error)
    }
    setLoading(false)
  }

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    
    if (!adminEmail || !adminPassword || !adminName) {
      setFormError('All fields are required')
      setLoading(false)
      return
    }
    
    const result = await signUpWithEmail(adminEmail, adminPassword, adminName, 'Admin')
    
    if (result.error) {
      setFormError(result.error)
    } else if (result.success) {
      router.push('/login?message=admin_signup_success')
    }
    setLoading(false)
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    
    if (!loginEmail || !loginPassword) {
      setFormError('Email and password are required')
      setLoading(false)
      return
    }
    
    const result = await signInWithEmail(loginEmail, loginPassword)
    
    if (result.error) {
      setFormError(result.error)
    } else if (result.success) {
      router.push('/admin/dashboard')
    }
    setLoading(false)
  }

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    
    if (!guestName || !guestVisualRole) {
      setFormError('Name and visual role are required')
      setLoading(false)
      return
    }
    
    if (guestEducationLevel === 'College' && !guestDepartment) {
      setFormError('Department is required for College education level')
      setLoading(false)
      return
    }
    
    const guestData: GuestUser = {
      name: guestName,
      visual_role: guestVisualRole,
      educational_level: guestEducationLevel || undefined,
      department: guestDepartment || undefined,
    }
    
    const result = await signInAsGuest(guestData)
    
    if (result.error) {
      setFormError(result.error)
    } else if (result.success) {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Maintenance Facility Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose your access path below
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error === 'auth_callback_error' 
                ? 'Authentication failed. Please try again.' 
                : 'An error occurred during authentication.'}
            </AlertDescription>
          </Alert>
        )}

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Admin Access</TabsTrigger>
            <TabsTrigger value="guest">Guest/User Portal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  Access the administrative interface for facility management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Button 
                    onClick={() => handleGoogleSignIn('Admin')}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Signing in...' : 'Sign in with Google (Admin)'}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup">
                    <form onSubmit={handleAdminSignUp} className="space-y-4">
                      <div>
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Creating account...' : 'Create Admin Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="guest" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guest/User Portal</CardTitle>
                <CardDescription>
                  Access the user portal for facility requests and viewing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => handleGoogleSignIn('User')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue as guest
                    </span>
                  </div>
                </div>

                <form onSubmit={handleGuestLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="guest-name">Name</Label>
                    <Input
                      id="guest-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="guest-visual-role">Visual Role</Label>
                    <Select value={guestVisualRole || ''} onValueChange={(value: VisualRole) => setGuestVisualRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="guest-education">Education Level (Optional)</Label>
                    <Select value={guestEducationLevel} onValueChange={setGuestEducationLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="High School">High School</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {guestEducationLevel === 'College' && (
                    <div>
                      <Label htmlFor="guest-department">Department (Required for College)</Label>
                      <Input
                        id="guest-department"
                        type="text"
                        value={guestDepartment}
                        onChange={(e) => setGuestDepartment(e.target.value)}
                        required={guestEducationLevel === 'College'}
                        placeholder="e.g., Computer Science, Engineering, etc."
                      />
                    </div>
                  )}
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Signing in...' : 'Continue as Guest'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
