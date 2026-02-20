"use client";

import { useEffect, useState } from "react";
import { getRequestAnalytics } from "@/actions/maintenance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Users, Star, TrendingUp, AlertCircle } from "lucide-react";
import { RequestAnalytics } from "@/types/maintenance";

export function Reports() {
  const [analytics, setAnalytics] = useState<RequestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getRequestAnalytics();
      
      if (result.error) {
        setError(result.error);
      } else {
        setAnalytics(result.data || null);
      }
    } catch (err) {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No data available</p>
            <p className="text-sm">
              Analytics will appear here once maintenance requests are submitted
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_requests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.pending_requests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.in_progress_requests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.completed_requests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests by Visual Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Requests by Visual Role
          </CardTitle>
          <CardDescription>
            Distribution of maintenance requests by user role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.requests_by_visual_role.Teacher}
                </div>
                <div className="text-sm text-gray-600">Teachers</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.requests_by_visual_role.Staff}
                </div>
                <div className="text-sm text-gray-600">Staff</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.requests_by_visual_role.Student}
                </div>
                <div className="text-sm text-gray-600">Students</div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="mt-6">
              <div className="flex items-end justify-center gap-4 h-32">
                {Object.entries(analytics.requests_by_visual_role).map(([role, count], index) => {
                  const maxCount = Math.max(...Object.values(analytics.requests_by_visual_role));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500"];
                  
                  return (
                    <div key={role} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full ${colors[index]} rounded-t transition-all duration-300`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-sm text-gray-600 mt-2">{role}</div>
                      <div className="text-xs text-gray-500">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Quality Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Work Quality Distribution
          </CardTitle>
          <CardDescription>
            Evaluation ratings for completed work orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(analytics.work_quality_distribution).map(([evaluation, count]) => {
                const total = Object.values(analytics.work_quality_distribution).reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors = {
                  "Outstanding": "bg-green-100 text-green-800 border-green-200",
                  "Very Satisfactory": "bg-blue-100 text-blue-800 border-blue-200",
                  "Satisfactory": "bg-yellow-100 text-yellow-800 border-yellow-200",
                  "Poor": "bg-red-100 text-red-800 border-red-200",
                };
                
                return (
                  <div key={evaluation} className="text-center">
                    <Badge className={colors[evaluation as keyof typeof colors]} variant="outline">
                      {evaluation}
                    </Badge>
                    <div className="text-2xl font-bold mt-2">{count}</div>
                    <div className="text-sm text-gray-600">{percentage}%</div>
                  </div>
                );
              })}
            </div>

            {/* Quality Chart */}
            <div className="mt-6">
              <div className="flex items-end justify-center gap-2 h-32">
                {Object.entries(analytics.work_quality_distribution).map(([evaluation, count], index) => {
                  const maxCount = Math.max(...Object.values(analytics.work_quality_distribution));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors = ["bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-red-500"];
                  
                  return (
                    <div key={evaluation} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full ${colors[index]} rounded-t transition-all duration-300`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        {evaluation.replace(" ", "\n")}
                      </div>
                      <div className="text-xs text-gray-500">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Requests by Category
          </CardTitle>
          <CardDescription>
            Breakdown of maintenance requests by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.requests_by_category).map(([category, count]) => (
              <div key={category} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((count / analytics.total_requests) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests by Urgency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Requests by Urgency
          </CardTitle>
          <CardDescription>
            Distribution of maintenance requests by urgency level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(analytics.requests_by_urgency).map(([urgency, count]) => {
              const colors = {
                "Emergency": "bg-red-100 text-red-800 border-red-200",
                "High": "bg-orange-100 text-orange-800 border-orange-200",
                "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
                "Low": "bg-gray-100 text-gray-800 border-gray-200",
              };
              
              return (
                <div key={urgency} className="text-center p-4 border rounded-lg">
                  <Badge className={colors[urgency as keyof typeof colors]} variant="outline">
                    {urgency}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
