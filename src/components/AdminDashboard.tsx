"use client";

import { useState } from "react";
import { WorkOrders } from "@/components/WorkOrders";
import { FacilitiesManagement } from "@/components/FacilitiesManagement";
import { Reports } from "@/components/Reports";
import { NotificationBell } from "@/components/NotificationBell";
import { EmptyUsers } from "@/components/EmptyStates";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { MobileUserCard } from "@/components/MobileUserCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Users, Building, BarChart3, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";

interface AdminDashboardProps {
  user: {
    id: string;
    email: string;
  };
  profile: {
    name: string | null;
  } | null;
  profiles: any[];
}

export function AdminDashboard({
  user,
  profile,
  profiles,
}: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                Admin Dashboard - Maintenance Facility Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <span className="text-sm text-gray-600">
                Admin: {profile?.name || user.email}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="work-orders"
                className="flex items-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                Work Orders
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="facilities"
                className="flex items-center gap-2"
              >
                <Building className="h-4 w-4" />
                Facilities
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>All Requests</CardTitle>
                    <CardDescription>
                      View and manage all maintenance requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Manage Requests</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage user accounts and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Manage Users
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Facility Management</CardTitle>
                    <CardDescription>
                      Configure facilities and equipment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Manage Facilities
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Reports & Analytics</CardTitle>
                    <CardDescription>
                      View reports and system analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                    <CardDescription>
                      Quick statistics and system status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          0
                        </div>
                        <div className="text-sm text-gray-500">
                          Pending Requests
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          0
                        </div>
                        <div className="text-sm text-gray-500">
                          Completed Today
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {profiles?.length || 0}
                        </div>
                        <div className="text-sm text-gray-500">Total Users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="work-orders">
              <WorkOrders />
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>All User Profiles</CardTitle>
                  <CardDescription>
                    Complete list of all registered users and their profiles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {!profiles || profiles.length === 0 ? (
                      <EmptyUsers />
                    ) : (
                      <ResponsiveTable
                        data={profiles}
                        columns={[
                          {
                            key: "name",
                            label: "Name",
                            render: (value) => value || "N/A",
                          },
                          {
                            key: "email",
                            label: "Email",
                            render: (value) => value || "No email",
                          },
                          {
                            key: "database_role",
                            label: "Database Role",
                            render: (value) => (
                              <Badge
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  value === "Admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {value || "N/A"}
                              </Badge>
                            ),
                          },
                          {
                            key: "visual_role",
                            label: "Visual Role",
                            render: (value) => value || "Not set",
                          },
                          {
                            key: "educational_level",
                            label: "Education Level",
                            render: (value) => value || "Not set",
                          },
                          {
                            key: "department",
                            label: "Department",
                            render: (value) => value || "N/A",
                          },
                          {
                            key: "created_at",
                            label: "Joined",
                            render: (value) =>
                              new Date(value).toLocaleDateString(),
                          },
                        ]}
                        emptyMessage="No profiles found"
                        mobileCardComponent={(profile) => (
                          <MobileUserCard key={profile.id} profile={profile} />
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="facilities">
              <FacilitiesManagement />
            </TabsContent>

            <TabsContent value="reports">
              <Reports />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
