"use client";

import { useEffect, useState } from "react";
import { getAllRequests, updateRequestStatus } from "@/actions/maintenance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Wrench,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { MaintenanceRequest, WORK_EVALUATIONS } from "@/types/maintenance";

export function WorkOrders() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    requestId: string;
    currentTitle: string;
  }>({ isOpen: false, requestId: "", currentTitle: "" });
  const [completionData, setCompletionData] = useState({
    action_taken: "",
    work_evaluation: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllRequests();

      if (result.error) {
        setError(result.error);
      } else {
        setRequests(result.data || []);
      }
    } catch (err) {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    requestId: string,
    newStatus: "Pending" | "In Progress" | "Completed",
  ) {
    if (newStatus === "Completed") {
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        setCompletionModal({
          isOpen: true,
          requestId,
          currentTitle: request.title,
        });
      }
    } else {
      await updateStatus(requestId, newStatus);
    }
  }

  async function updateStatus(
    requestId: string,
    newStatus: "Pending" | "In Progress" | "Completed",
    completionData?: { action_taken: string; work_evaluation: string },
  ) {
    setUpdatingId(requestId);

    try {
      const result = await updateRequestStatus(
        requestId,
        newStatus,
        completionData,
      );

      if (result.error) {
        setError(result.error);
      } else {
        // Update the request in the local state
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                  ...req,
                  status: newStatus,
                  ...(completionData && {
                    action_taken: completionData.action_taken,
                    work_evaluation:
                      completionData.work_evaluation as MaintenanceRequest["work_evaluation"],
                  }),
                }
              : req,
          ),
        );
      }
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCompletionSubmit() {
    if (!completionData.action_taken || !completionData.work_evaluation) {
      setError("Action taken and work evaluation are required for completion");
      return;
    }

    await updateStatus(completionModal.requestId, "Completed", completionData);
    setCompletionModal({ isOpen: false, requestId: "", currentTitle: "" });
    setCompletionData({ action_taken: "", work_evaluation: "" });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function getUrgencyColor(urgency: string) {
    switch (urgency) {
      case "Emergency":
        return "bg-red-100 text-red-800 border-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Work Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading work orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Work Orders
          </CardTitle>
          <CardDescription>
            Manage all maintenance requests and update their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No work orders yet</p>
              <p className="text-sm">
                Maintenance requests will appear here once users submit them
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {request.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {request.description}
                      </p>
                      {request.supporting_reasons && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                          Supporting: {request.supporting_reasons}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span>
                          Requested by: {request.requester?.name || "Unknown"}
                        </span>
                        <span>•</span>
                        <span>{request.requester?.email || "No email"}</span>
                        {request.requester?.visual_role && (
                          <>
                            <span>•</span>
                            <span>{request.requester.visual_role}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <Badge className={getUrgencyColor(request.urgency)}>
                        {request.urgency}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {request.location_building}
                      {request.location_room && ` - ${request.location_room}`}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {request.category}
                    </div>
                  </div>

                  {request.status === "Completed" && request.action_taken && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="text-sm">
                        <p className="font-medium text-green-800">
                          Action Taken:
                        </p>
                        <p className="text-green-700">{request.action_taken}</p>
                        {request.work_evaluation && (
                          <p className="mt-1">
                            <span className="font-medium text-green-800">
                              Evaluation:
                            </span>
                            <span className="ml-1 text-green-700">
                              {request.work_evaluation}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm font-medium text-gray-700">
                      Change Status:
                    </span>
                    <Select
                      value={request.status}
                      onValueChange={(value) =>
                        handleStatusChange(
                          request.id,
                          value as "Pending" | "In Progress" | "Completed",
                        )
                      }
                      disabled={updatingId === request.id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {updatingId === request.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Modal */}
      {completionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Complete Work Order</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCompletionModal({
                    isOpen: false,
                    requestId: "",
                    currentTitle: "",
                  })
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Completing:{" "}
                  <span className="font-medium">
                    {completionModal.currentTitle}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action_taken">Action Taken *</Label>
                <textarea
                  id="action_taken"
                  className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                  placeholder="Describe what work was completed..."
                  value={completionData.action_taken}
                  onChange={(e) =>
                    setCompletionData((prev) => ({
                      ...prev,
                      action_taken: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_evaluation">Work Evaluation *</Label>
                <Select
                  value={completionData.work_evaluation}
                  onValueChange={(value) =>
                    setCompletionData((prev) => ({
                      ...prev,
                      work_evaluation: value,
                    }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select evaluation" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_EVALUATIONS.map((evaluation) => (
                      <SelectItem key={evaluation} value={evaluation}>
                        {evaluation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCompletionSubmit}
                  disabled={
                    !completionData.action_taken ||
                    !completionData.work_evaluation
                  }
                  className="flex-1"
                >
                  Complete Work Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCompletionModal({
                      isOpen: false,
                      requestId: "",
                      currentTitle: "",
                    })
                  }
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
