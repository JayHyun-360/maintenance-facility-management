"use client";

import { useState } from "react";
import { RequestForm } from "@/components/RequestForm";
import { RequestList } from "@/components/RequestList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, List, Plus } from "lucide-react";

interface UserDashboardProps {
  user: {
    id: string;
    email: string;
  };
  profile: {
    name: string | null;
    visual_role: string | null;
    educational_level: string | null;
    department: string | null;
  } | null;
}

export function UserDashboard({ user, profile }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRequestSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab("requests");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                Maintenance Facility Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {profile?.name || user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="new-request" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                My Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Request</CardTitle>
                    <CardDescription>
                      Create a new maintenance request
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => setActiveTab("new-request")}
                    >
                      New Request
                    </Button>
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
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab("requests")}
                    >
                      View Requests
                    </Button>
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
                    <Button variant="outline" className="w-full">
                      View Status
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Profile Information */}
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
                          <p className="text-sm font-medium text-gray-500">
                            Visual Role
                          </p>
                          <p className="text-sm text-gray-900">
                            {profile.visual_role || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Education Level
                          </p>
                          <p className="text-sm text-gray-900">
                            {profile.educational_level || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Department
                          </p>
                          <p className="text-sm text-gray-900">
                            {profile.department || "Not set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Requests Preview */}
              <div className="mt-8">
                <RequestList userId={user.id} refreshTrigger={refreshTrigger} />
              </div>
            </TabsContent>

            <TabsContent value="new-request">
              <RequestForm onSuccess={handleRequestSuccess} />
            </TabsContent>

            <TabsContent value="requests">
              <RequestList userId={user.id} refreshTrigger={refreshTrigger} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
