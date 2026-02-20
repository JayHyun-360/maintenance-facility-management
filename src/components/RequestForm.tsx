"use client";

import { useState, useEffect } from "react";
import { createMaintenanceRequest, getFacilities } from "@/actions/maintenance";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wrench, AlertCircle, CheckCircle } from "lucide-react";
import { CATEGORIES, URGENCY_LEVELS } from "@/types/maintenance";
import { toast } from "sonner";

interface RequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RequestForm({ onSuccess, onCancel }: RequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const result = await getFacilities();
        if (result.success && result.data) {
          setFacilities(result.data);
        } else {
          console.error("Failed to fetch facilities:", result.error);
        }
      } catch (err) {
        console.error("Error fetching facilities:", err);
      } finally {
        setLoadingFacilities(false);
      }
    }

    fetchFacilities();
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await createMaintenanceRequest(formData);

      if (result.error) {
        setError(result.error);
        toast.error("Failed to submit request", {
          description:
            result.error ||
            "There was an error submitting your maintenance request. Please check the form and try again.",
        });
      } else {
        setSuccess(true);
        toast.success("Maintenance request submitted!", {
          description:
            "Your request has been successfully submitted and will be reviewed by the maintenance team.",
        });
        // Clear form
        const form = document.getElementById("request-form") as HTMLFormElement;
        if (form) form.reset();

        // Call success callback after a delay
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Submit Maintenance Request
        </CardTitle>
        <CardDescription>
          Fill out the form below to create a new maintenance request
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

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Maintenance request submitted successfully!
            </AlertDescription>
          </Alert>
        )}

        <form id="request-form" action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Request Title *</Label>
              <Input
                id="title"
                name="title"
                type="text"
                placeholder="Brief description of the issue"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select name="category" required disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              name="description"
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
              placeholder="Detailed description of the maintenance issue"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supporting_reasons">Supporting Reasons</Label>
            <textarea
              id="supporting_reasons"
              name="supporting_reasons"
              className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
              placeholder="Additional information or reasons supporting this request"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency *</Label>
              <Select name="urgency" required disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_building">Building *</Label>
              {loadingFacilities ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select
                  name="location_building"
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.name}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_room">Room Number</Label>
              <Input
                id="location_room"
                name="location_room"
                type="text"
                placeholder="e.g., 101, Lab-3, etc."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || loadingFacilities}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
