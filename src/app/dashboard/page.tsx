import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { signOut } from '@/actions/auth'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Maintenance Facility Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {profile?.name || user.email}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="outline">Sign Out</Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Request</CardTitle>
                <CardDescription>
                  Create a new maintenance request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">New Request</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>
                  View and track your maintenance requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Requests</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facility Status</CardTitle>
                <CardDescription>
                  Check current facility status and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Status</Button>
              </CardContent>
            </Card>
          </div>

          {profile && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-sm text-gray-900">{profile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Visual Role</p>
                      <p className="text-sm text-gray-900">{profile.visual_role || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Education Level</p>
                      <p className="text-sm text-gray-900">{profile.educational_level || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p className="text-sm text-gray-900">{profile.department || 'Not set'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
