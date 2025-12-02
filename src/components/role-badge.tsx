import { Badge } from "@/components/ui/badge";
import type { UserType } from "@/types/schema";
import { GraduationCap, Users, Shield } from "lucide-react";

interface RoleBadgeProps {
  role: UserType;
  className?: string;
}

const roleConfig: Record<UserType, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof GraduationCap }> = {
  student: {
    label: "Student",
    variant: "default",
    icon: GraduationCap,
  },
  mentor: {
    label: "Mentor",
    variant: "secondary",
    icon: Users,
  },
  staff: {
    label: "Staff",
    variant: "destructive",
    icon: Shield,
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
