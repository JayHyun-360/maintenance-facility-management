import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Calendar, User as UserIcon, Building, GraduationCap } from "lucide-react";

interface MobileUserCardProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    database_role: string | null;
    visual_role: string | null;
    educational_level: string | null;
    department: string | null;
    created_at: string;
  };
}

export function MobileUserCard({ profile }: MobileUserCardProps) {
  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "Admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "User":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="mb-4 dls-card">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Name and Email */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                {profile.name || "N/A"}
              </h3>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-1" />
                {profile.email || "No email"}
              </div>
            </div>
            <Badge className={getRoleBadgeColor(profile.database_role)}>
              {profile.database_role || "N/A"}
            </Badge>
          </div>

          {/* Role and Department Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="flex items-center text-gray-500 mb-1">
                <UserIcon className="h-4 w-4 mr-1" />
                Visual Role
              </div>
              <p className="font-medium text-gray-900">
                {profile.visual_role || "Not set"}
              </p>
            </div>
            <div>
              <div className="flex items-center text-gray-500 mb-1">
                <GraduationCap className="h-4 w-4 mr-1" />
                Education
              </div>
              <p className="font-medium text-gray-900">
                {profile.educational_level || "Not set"}
              </p>
            </div>
          </div>

          {/* Department and Join Date */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="flex items-center text-gray-500 mb-1">
                <Building className="h-4 w-4 mr-1" />
                Department
              </div>
              <p className="font-medium text-gray-900">
                {profile.department || "N/A"}
              </p>
            </div>
            <div>
              <div className="flex items-center text-gray-500 mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Joined
              </div>
              <p className="font-medium text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
