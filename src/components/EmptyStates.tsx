import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wrench, FileText, Users, Building, Plus, Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  };
  illustration?: "wrench" | "document" | "users" | "building" | "search";
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  illustration = "wrench",
}: EmptyStateProps) {
  const getIllustration = () => {
    switch (illustration) {
      case "wrench":
        return (
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
              <Wrench className="h-12 w-12 text-green-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full animate-pulse" />
          </div>
        );
      case "document":
        return (
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <FileText className="h-12 w-12 text-blue-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full animate-pulse" />
          </div>
        );
      case "users":
        return (
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
              <Users className="h-12 w-12 text-purple-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full animate-pulse" />
          </div>
        );
      case "building":
        return (
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
              <Building className="h-12 w-12 text-orange-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full animate-pulse" />
          </div>
        );
      case "search":
        return (
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <Search className="h-12 w-12 text-gray-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-500 rounded-full animate-pulse" />
          </div>
        );
      default:
        return (
          icon || <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        );
    }
  };

  return (
    <div className="text-center py-12 px-6">
      {getIllustration()}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="min-w-[160px]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function EmptyWorkOrders({
  onCreateRequest,
}: {
  onCreateRequest?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance Requests
        </CardTitle>
        <CardDescription>
          Manage all maintenance requests and update their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="No work orders yet"
          description="Maintenance requests will appear here once users submit them. The system is ready to handle requests efficiently."
          illustration="wrench"
          action={
            onCreateRequest
              ? {
                  label: "Create Sample Request",
                  onClick: onCreateRequest,
                  variant: "outline",
                }
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

export function EmptyRequests({
  onCreateFirst,
}: {
  onCreateFirst: () => void;
}) {
  return (
    <EmptyState
      title="No requests yet"
      description="Submit your first maintenance request to get started. Our team will respond promptly to your needs."
      illustration="wrench"
      action={{
        label: "Create Your First Request",
        onClick: onCreateFirst,
      }}
    />
  );
}

export function EmptyUsers() {
  return (
    <EmptyState
      title="No user profiles found"
      description="No users have registered yet. The system will display user profiles here once they create accounts."
      illustration="users"
    />
  );
}

export function EmptyFacilities({
  onAddFacility,
}: {
  onAddFacility: () => void;
}) {
  return (
    <EmptyState
      title="No facilities configured"
      description="Add facilities to start managing maintenance requests across different buildings and locations."
      illustration="building"
      action={{
        label: "Add Your First Facility",
        onClick: onAddFacility,
      }}
    />
  );
}

export function EmptySearch({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      title="No results found"
      description={`No maintenance requests match "${searchTerm}". Try adjusting your search terms or filters.`}
      illustration="search"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      title="All caught up!"
      description="You have no notifications at the moment. We'll notify you when there are updates to your requests."
      illustration="document"
    />
  );
}
