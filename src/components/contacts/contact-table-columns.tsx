"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Linkedin,
  Github,
  Globe,
  MoreHorizontal,
  User,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/schema";
import { TableColumnHeader } from "@/components/kibo-ui/table";

/**
 * Type badge color mapping
 */
const TYPE_COLORS: Record<string, string> = {
  Student: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Mentor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Staff: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Faculty: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  External: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  Leadership: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

/**
 * Webflow status badge variant mapping
 */
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Active: "default",
  Draft: "secondary",
  Archived: "outline",
};

/**
 * Format a date as relative time (e.g., "2 days ago", "3 weeks ago")
 */
function formatRelativeDate(dateString: string | undefined): string {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

/**
 * Get display name for a contact
 * Falls back to email username if no name available
 */
function getDisplayName(contact: Contact): string {
  // Check if fullName has content
  if (contact.fullName && contact.fullName.trim()) {
    return contact.fullName.trim();
  }

  // Try firstName + lastName
  const firstName = contact.firstName?.trim() || "";
  const lastName = contact.lastName?.trim() || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  // Fall back to email username
  if (contact.email) {
    const emailParts = contact.email.split("@");
    return emailParts[0]; // Return part before @
  }

  return "Unnamed Contact";
}

/**
 * Get initials from a contact
 * Uses name if available, otherwise email, otherwise generic icon
 */
function getInitials(contact: Contact): string {
  // Try name first
  const name = contact.fullName?.trim() ||
    `${contact.firstName?.trim() || ""} ${contact.lastName?.trim() || ""}`.trim();

  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
  }

  // Fall back to email
  if (contact.email) {
    return contact.email.charAt(0).toUpperCase();
  }

  return "?";
}

/**
 * Check if contact is missing name data
 */
function isMissingName(contact: Contact): boolean {
  const hasFullName = contact.fullName && contact.fullName.trim();
  const hasFirstName = contact.firstName && contact.firstName.trim();
  const hasLastName = contact.lastName && contact.lastName.trim();
  return !hasFullName && !hasFirstName && !hasLastName;
}

/**
 * Get headshot URL from contact
 */
function getHeadshotUrl(contact: Contact): string | undefined {
  if (!contact.headshot || contact.headshot.length === 0) return undefined;
  const headshot = contact.headshot[0];
  // Handle both Airtable attachment format and simple URL format
  if (typeof headshot === "string") return headshot;
  if (headshot?.url) return headshot.url;
  if (headshot?.thumbnails?.large?.url) return headshot.thumbnails.large.url;
  return undefined;
}

interface CreateColumnsOptions {
  onContactClick?: (contact: Contact) => void;
}

export function createContactTableColumns({
  onContactClick,
}: CreateColumnsOptions = {}): ColumnDef<Contact>[] {
  const columns: ColumnDef<Contact>[] = [];

  // Contact column (Avatar + Name + Email)
  columns.push({
    accessorKey: "fullName",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Contact" />
    ),
    size: 280,
    minSize: 200,
    maxSize: 400,
    cell: ({ row }) => {
      const contact = row.original;
      const headshotUrl = getHeadshotUrl(contact);
      const displayName = getDisplayName(contact);
      const initials = getInitials(contact);
      const missingName = isMissingName(contact);

      return (
        <div className="flex items-center gap-3 min-w-[180px]">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={headshotUrl} alt={displayName} />
            <AvatarFallback className={cn(
              "text-xs",
              missingName && "bg-muted text-muted-foreground"
            )}>
              {missingName ? <User className="h-4 w-4" /> : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-medium truncate",
              missingName && "text-muted-foreground italic"
            )}>
              {displayName}
            </span>
            {contact.email && (
              <span className="text-sm text-muted-foreground truncate">
                {contact.email}
              </span>
            )}
            {!contact.email && missingName && (
              <span className="text-xs text-destructive/70">
                Missing contact info
              </span>
            )}
          </div>
        </div>
      );
    },
  });

  // Type column
  columns.push({
    accessorKey: "type",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Type" />
    ),
    size: 100,
    minSize: 80,
    maxSize: 150,
    cell: ({ row }) => {
      const type = row.original.type;

      if (!type) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <Badge
          variant="outline"
          className={cn("font-normal", TYPE_COLORS[type])}
        >
          {type}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id) as string);
    },
  });

  // Phone column
  columns.push({
    accessorKey: "phone",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Phone" />
    ),
    size: 140,
    minSize: 100,
    maxSize: 200,
    cell: ({ row }) => {
      const phone = row.original.phone;

      if (!phone) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
        </a>
      );
    },
    enableSorting: false,
  });

  // Expertise column
  columns.push({
    accessorKey: "expertise",
    header: "Expertise",
    size: 180,
    minSize: 120,
    maxSize: 300,
    cell: ({ row }) => {
      const expertise = row.original.expertise;

      if (!expertise || expertise.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      const visibleTags = expertise.slice(0, 2);
      const remainingCount = expertise.length - 2;

      return (
        <div className="flex items-center gap-1 flex-wrap">
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{remainingCount}
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  });

  // Webflow Status column
  columns.push({
    accessorKey: "webflowStatus",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Status" />
    ),
    size: 100,
    minSize: 80,
    maxSize: 150,
    cell: ({ row }) => {
      const status = row.original.webflowStatus;

      if (!status) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <Badge variant={STATUS_VARIANTS[status] || "outline"}>
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id) as string);
    },
  });

  // Last Updated column
  columns.push({
    accessorKey: "lastModified",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Updated" />
    ),
    size: 100,
    minSize: 80,
    maxSize: 140,
    cell: ({ row }) => {
      const lastModified = row.original.lastModified;
      const formatted = formatRelativeDate(lastModified);

      return (
        <span
          className="text-sm text-muted-foreground"
          title={lastModified ? new Date(lastModified).toLocaleString() : undefined}
        >
          {formatted}
        </span>
      );
    },
  });

  // Links column
  columns.push({
    id: "links",
    header: "Links",
    size: 100,
    minSize: 80,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const contact = row.original;
      const hasLinks = contact.linkedIn || contact.gitHub || contact.websiteUrl;

      if (!hasLinks) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <div className="flex items-center gap-1">
          {contact.linkedIn && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={contact.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn"
              >
                <Linkedin className="h-4 w-4 text-muted-foreground hover:text-[#0A66C2]" />
              </a>
            </Button>
          )}
          {contact.gitHub && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={contact.gitHub}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
              >
                <Github className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </a>
            </Button>
          )}
          {contact.websiteUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={contact.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Website"
              >
                <Globe className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </a>
            </Button>
          )}
        </div>
      );
    },
    enableSorting: false,
  });

  // Actions column (shows when row is hovered)
  columns.push({
    id: "actions",
    header: "",
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    cell: ({ row }) => {
      const contact = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onContactClick?.(contact);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  });

  return columns;
}
