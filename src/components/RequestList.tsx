"use client";

import { useEffect, useState } from "react";
import { getUserRequests } from "@/actions/maintenance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Wrench,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Download,
} from "lucide-react";
import { MaintenanceRequest } from "@/types/maintenance";
import { PDFGenerator } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { updateRequestStatus } from "@/actions/maintenance";
import { RequestListSkeleton } from "@/components/LoadingStates";
import { EmptyRequests } from "@/components/EmptyStates";

interface RequestListProps {
  userId: string;
  refreshTrigger?: number;
  onCreateFirstRequest?: () => void;
}

export function RequestList({
  userId,
  refreshTrigger,
  onCreateFirstRequest,
}: RequestListProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);

      try {
        const result = await getUserRequests(userId);

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

    fetchRequests();
  }, [userId, refreshTrigger]);

  function handleStatusChange(
    requestId: string,
    newStatus: "Pending" | "In Progress" | "Completed",
  ) {
    setUpdatingId(requestId);

    (async () => {
      try {
        const result = await updateRequestStatus(requestId, newStatus);

        if (result.error) {
          setError(result.error);
        } else {
          setRequests((prev) =>
            prev.map((req) =>
              req.id === requestId ? { ...req, status: newStatus } : req,
            ),
          );
        }
      } catch (err) {
        setError("Failed to update status");
      } finally {
        setUpdatingId(null);
      }
    })();
  }

  function handleDownloadPDF(request: MaintenanceRequest) {
    try {
      const pdfData = {
        request,
        requesterName: request.requester?.full_name || "Unknown",
        generatedAt: new Date().toLocaleString(),
      };

      PDFGenerator.downloadPDF(pdfData);
      toast.success("PDF downloaded successfully!", {
        description: `Request "${request.title}" has been downloaded to your device.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", {
        description: "There was an error creating the PDF. Please try again.",
      });
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Pending":
        return "dls-status-pending";
      case "In Progress":
        return "dls-status-progress";
      case "Completed":
        return "dls-status-completed";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function getUrgencyColor(urgency: string) {
    switch (urgency) {
      case "Emergency":
        return "dls-urgency-emergency";
      case "High":
        return "dls-urgency-high";
      case "Medium":
        return "dls-urgency-medium";
      case "Low":
        return "dls-urgency-low";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (loading) {
    return <RequestListSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            My Maintenance Requests
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          My Maintenance Requests
        </CardTitle>
        <CardDescription>
          Track the status of your maintenance requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <EmptyRequests onCreateFirst={onCreateFirstRequest || (() => {})} />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors dls-card fade-in"
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
                        Requested by:{" "}
                        {request.requester?.full_name || "Unknown"}
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

                  {request.status === "Completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(request)}
                      className="ml-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
