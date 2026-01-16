"use client";

/**
 * Data table component for displaying database records in chat.
 *
 * Features:
 * - Auto-detects columns from data
 * - Formats dates, statuses, and common field types
 * - Compact display with expandable rows
 * - Responsive scrolling
 */

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Users,
  FileText,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Field configuration for known columns
interface FieldConfig {
  label: string;
  priority: number; // Lower = shown first
  format?: (value: unknown) => React.ReactNode;
  hidden?: boolean;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  // Task statuses
  "Not Started": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  // Session statuses
  Scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "No-Show": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  // Priority
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  // General
  Active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

// Status icons
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Completed":
      return <CheckCircle2 className="h-3 w-3" />;
    case "In Progress":
      return <Clock className="h-3 w-3" />;
    case "Cancelled":
      return <XCircle className="h-3 w-3" />;
    case "Urgent":
    case "High":
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
}

// Format a date string
function formatDate(value: unknown): string {
  if (!value) return "—";
  try {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return String(value);
  }
}

// Format a datetime string
function formatDateTime(value: unknown): string {
  if (!value) return "—";
  try {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

// Known field configurations
const FIELD_CONFIGS: Record<string, FieldConfig> = {
  // Identity fields (hidden - usually just IDs)
  id: { label: "ID", priority: 100, hidden: true },
  taskId: { label: "Task ID", priority: 100, hidden: true },
  sessionId: { label: "Session ID", priority: 100, hidden: true },
  teamId: { label: "Team ID", priority: 100, hidden: true },
  contactId: { label: "Contact ID", priority: 100, hidden: true },

  // Primary display fields
  name: { label: "Name", priority: 1 },
  fullName: { label: "Name", priority: 1 },
  teamName: { label: "Team", priority: 1 },
  title: { label: "Title", priority: 1 },

  // Status fields
  status: {
    label: "Status",
    priority: 2,
    format: (v) => {
      const status = String(v || "");
      return (
        <Badge variant="secondary" className={cn("gap-1 text-[10px]", STATUS_COLORS[status])}>
          <StatusIcon status={status} />
          {status}
        </Badge>
      );
    },
  },
  priority: {
    label: "Priority",
    priority: 3,
    format: (v) => {
      const priority = String(v || "");
      return (
        <Badge variant="secondary" className={cn("gap-1 text-[10px]", STATUS_COLORS[priority])}>
          {priority}
        </Badge>
      );
    },
  },

  // Date fields
  due: { label: "Due", priority: 4, format: formatDate },
  scheduledStart: { label: "Date", priority: 4, format: formatDateTime },
  startDate: { label: "Start", priority: 5, format: formatDate },
  endDate: { label: "End", priority: 6, format: formatDate },
  created: { label: "Created", priority: 10, format: formatDate },
  lastModified: { label: "Modified", priority: 11, format: formatDate },

  // Relationship fields
  assignedTo: {
    label: "Assigned",
    priority: 5,
    format: (v) => {
      if (Array.isArray(v)) {
        const names = v.map((c) => c.fullName || c.firstName || "Unknown").join(", ");
        return <span className="text-muted-foreground">{names || "—"}</span>;
      }
      return "—";
    },
  },
  team: {
    label: "Team",
    priority: 5,
    format: (v) => {
      if (Array.isArray(v)) {
        const names = v.map((t) => t.teamName || "Unknown").join(", ");
        return names || "—";
      }
      return "—";
    },
  },
  mentor: {
    label: "Mentor",
    priority: 5,
    format: (v) => {
      if (Array.isArray(v)) {
        const names = v.map((c) => c.fullName || c.firstName || "Unknown").join(", ");
        return names || "—";
      }
      return "—";
    },
  },

  // Description fields (truncated)
  description: {
    label: "Description",
    priority: 8,
    format: (v) => {
      const text = String(v || "");
      if (text.length > 50) return text.slice(0, 50) + "...";
      return text || "—";
    },
  },
  summary: {
    label: "Summary",
    priority: 8,
    format: (v) => {
      const text = String(v || "");
      if (text.length > 50) return text.slice(0, 50) + "...";
      return text || "—";
    },
  },

  // Session fields
  sessionType: { label: "Type", priority: 3 },
  duration: {
    label: "Duration",
    priority: 7,
    format: (v) => (v ? `${v} min` : "—"),
  },

  // Contact fields
  email: { label: "Email", priority: 6 },
  type: { label: "Type", priority: 4 },

  // Effort field
  levelOfEffort: {
    label: "Effort",
    priority: 6,
    format: (v) => (v ? <Badge variant="outline" className="text-[10px]">{String(v)}</Badge> : "—"),
  },
};

// Get config for a field
function getFieldConfig(field: string): FieldConfig {
  return FIELD_CONFIGS[field] || {
    label: field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim(),
    priority: 50,
  };
}

// Detect entity type from data
function detectEntityType(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "records";
  const sample = data[0];
  if ("taskId" in sample || "levelOfEffort" in sample) return "tasks";
  if ("sessionId" in sample || "scheduledStart" in sample) return "sessions";
  if ("teamId" in sample || "teamName" in sample) return "teams";
  if ("fullName" in sample || "email" in sample) return "contacts";
  return "records";
}

// Get icon for entity type
function EntityIcon({ type }: { type: string }) {
  switch (type) {
    case "tasks":
      return <FileText className="h-3.5 w-3.5" />;
    case "sessions":
      return <Calendar className="h-3.5 w-3.5" />;
    case "teams":
      return <Users className="h-3.5 w-3.5" />;
    case "contacts":
      return <User className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

interface ChatDataTableProps {
  data: Record<string, unknown>[];
  title?: string;
  maxRows?: number;
}

export function ChatDataTable({ data, title, maxRows = 5 }: ChatDataTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        No records found
      </div>
    );
  }

  const entityType = detectEntityType(data);

  // Get all unique fields from data
  const allFields = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => allFields.add(key));
  });

  // Sort fields by priority and filter hidden ones
  const columns = Array.from(allFields)
    .map((field) => ({ field, config: getFieldConfig(field) }))
    .filter(({ config }) => !config.hidden)
    .sort((a, b) => a.config.priority - b.config.priority)
    .slice(0, 6); // Max 6 columns for readability

  const displayData = expanded ? data : data.slice(0, maxRows);
  const hasMore = data.length > maxRows;

  return (
    <div className="my-2 rounded-md border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <EntityIcon type={entityType} />
        <span className="text-xs font-medium">
          {title || `${data.length} ${entityType}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map(({ field, config }) => (
                <TableHead key={field} className="h-8 text-[11px] font-medium">
                  {config.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, i) => (
              <TableRow key={row.id as string || i} className="transition-colors duration-150">
                {columns.map(({ field, config }) => (
                  <TableCell key={field} className="py-1.5 text-xs">
                    {config.format
                      ? config.format(row[field])
                      : row[field] != null
                      ? String(row[field])
                      : "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors duration-150 border-t border-border/50"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" />
              Show {data.length - maxRows} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Parse JSON code blocks from message content and render as data tables.
 * Looks for ```json blocks containing arrays.
 */
export function parseDataTables(content: string): {
  tables: { data: Record<string, unknown>[]; title?: string }[];
  cleanContent: string;
} {
  const tables: { data: Record<string, unknown>[]; title?: string }[] = [];
  let cleanContent = content;

  // Match ```json blocks
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        tables.push({ data: parsed });
        cleanContent = cleanContent.replace(match[0], "");
      }
    } catch {
      // Not valid JSON, leave as-is
    }
  }

  return { tables, cleanContent: cleanContent.trim() };
}
