"use client";

import { useEffect, useState } from "react";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from "@/actions/maintenance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Building,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { Facility } from "@/types/maintenance";

export function FacilitiesManagement() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFacilities();
  }, []);

  async function fetchFacilities() {
    setLoading(true);
    setError(null);

    try {
      const result = await getFacilities();

      if (result.error) {
        setError(result.error);
      } else {
        setFacilities(result.data || []);
      }
    } catch (err) {
      setError("Failed to load facilities");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingFacility) {
        // Update existing facility
        const result = await updateFacility(
          editingFacility.id,
          formData.name,
          formData.description || undefined,
          formData.is_active,
        );

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("Facility updated successfully");
          setEditingFacility(null);
          setFormData({ name: "", description: "", is_active: true });
          fetchFacilities();
        }
      } else {
        // Create new facility
        const result = await createFacility(
          formData.name,
          formData.description || undefined,
        );

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("Facility created successfully");
          setFormData({ name: "", description: "", is_active: true });
          setIsCreateModalOpen(false);
          fetchFacilities();
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  }

  async function handleDelete(facilityId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this facility? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const result = await deleteFacility(facilityId);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Facility deleted successfully");
        fetchFacilities();
      }
    } catch (err) {
      setError("Failed to delete facility");
    }
  }

  function openEditModal(facility: Facility) {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      description: facility.description || "",
      is_active: facility.is_active,
    });
  }

  function closeModal() {
    setEditingFacility(null);
    setIsCreateModalOpen(false);
    setFormData({ name: "", description: "", is_active: true });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Facilities Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading facilities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Facilities Management
              </CardTitle>
              <CardDescription>
                Manage building and facility locations for maintenance requests
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Facility
            </Button>
          </div>
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
                {success}
              </AlertDescription>
            </Alert>
          )}

          {facilities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No facilities yet</p>
              <p className="text-sm mb-4">
                Add your first facility to get started with maintenance requests
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Facility
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {facilities.map((facility) => (
                <div
                  key={facility.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {facility.name}
                        </h3>
                        <Badge
                          variant={facility.is_active ? "default" : "secondary"}
                        >
                          {facility.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {facility.description && (
                        <p className="text-sm text-gray-600">
                          {facility.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Created:{" "}
                        {new Date(facility.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(facility)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(facility.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingFacility) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingFacility ? "Edit Facility" : "Add New Facility"}
              </h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Facility Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Main Building, Science Lab"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                  placeholder="Brief description of the facility"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingFacility ? "Update Facility" : "Create Facility"}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
