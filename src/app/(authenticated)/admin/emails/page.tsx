"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Settings,
  Eye,
  XCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { toast } from "sonner";
import { useUserType } from "@/hooks/use-user-type";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EmailConfig {
  isEnabled: boolean;
  isTestMode: boolean;
  testRecipient: string | null;
  fromEmail: string;
  appUrl: string;
  envVars: {
    RESEND_API_KEY: string;
    RESEND_FROM_EMAIL: string;
    EMAIL_TEST_MODE: string;
    EMAIL_TEST_RECIPIENT: string;
    NEXT_PUBLIC_APP_URL: string;
  };
}

interface ScheduledEmail {
  emailId: string;
  emailKey: string;
  sessionId: string;
  sessionType: string;
  scheduledFor: string | null;
  status: string;
  recipient: string;
  error?: string;
}

// Grouped structure types
interface ContactEmails {
  recipient: string;
  emails: ScheduledEmail[];
}

interface SessionGroup {
  sessionId: string;
  sessionType: string;
  contacts: ContactEmails[];
}

interface DayGroup {
  date: Date;
  label: string;
  sessions: SessionGroup[];
  emailCount: number;
}

/**
 * Get a human-readable label for a date
 */
function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

/**
 * Get email type label from key
 */
function getEmailTypeLabel(emailKey: string): string {
  const emailType = emailKey.split("_")[0];
  switch (emailType) {
    case "prep48h":
      return "Prep (48h)";
    case "prep24h":
      return "Prep (24h)";
    case "feedbackImmediate":
      return "Feedback";
    default:
      return emailType;
  }
}

/**
 * Group emails by day → session → contact
 */
function groupEmails(emails: ScheduledEmail[]): DayGroup[] {
  const dayMap = new Map<string, DayGroup>();

  for (const email of emails) {
    if (!email.scheduledFor) continue;

    const emailDate = new Date(email.scheduledFor);
    const dayKey = startOfDay(emailDate).toISOString();

    // Get or create day group
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: startOfDay(emailDate),
        label: getDayLabel(emailDate),
        sessions: [],
        emailCount: 0,
      });
    }
    const dayGroup = dayMap.get(dayKey)!;
    dayGroup.emailCount++;

    // Find or create session group within day
    let sessionGroup = dayGroup.sessions.find(
      (s) => s.sessionId === email.sessionId
    );
    if (!sessionGroup) {
      sessionGroup = {
        sessionId: email.sessionId,
        sessionType: email.sessionType,
        contacts: [],
      };
      dayGroup.sessions.push(sessionGroup);
    }

    // Find or create contact within session
    let contactGroup = sessionGroup.contacts.find(
      (c) => c.recipient === email.recipient
    );
    if (!contactGroup) {
      contactGroup = {
        recipient: email.recipient,
        emails: [],
      };
      sessionGroup.contacts.push(contactGroup);
    }

    contactGroup.emails.push(email);
  }

  // Sort days chronologically
  const sortedDays = Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Sort sessions within each day by time
  for (const day of sortedDays) {
    day.sessions.sort((a, b) => {
      const aTime = a.contacts[0]?.emails[0]?.scheduledFor || "";
      const bTime = b.contacts[0]?.emails[0]?.scheduledFor || "";
      return aTime.localeCompare(bTime);
    });
  }

  return sortedDays;
}

export default function AdminEmailsPage() {
  const router = useRouter();
  const { userType, isLoading: userLoading } = useUserType();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set());

  // Redirect non-staff users
  useEffect(() => {
    if (!userLoading && userType !== "staff") {
      router.push("/dashboard");
    }
  }, [userType, userLoading, router]);

  // Fetch email config
  const { data: config, error: configError } = useSWR<EmailConfig>(
    "/api/admin/emails/config",
    fetcher
  );

  // Fetch scheduled emails
  const {
    data: scheduledData,
    error: scheduledError,
    mutate: mutateScheduled,
    isValidating: isRefreshing,
  } = useSWR<{ emails: ScheduledEmail[]; total: number }>(
    "/api/admin/emails/scheduled",
    fetcher
  );

  // Group emails by day → session → contact
  const groupedEmails = useMemo(() => {
    if (!scheduledData?.emails) return [];
    return groupEmails(scheduledData.emails);
  }, [scheduledData?.emails]);

  // Initialize open states when data loads (expand first day and its sessions)
  useEffect(() => {
    if (groupedEmails.length > 0 && openDays.size === 0) {
      const firstDayKey = groupedEmails[0].date.toISOString();
      setOpenDays(new Set([firstDayKey]));
      // Open all sessions in the first day
      const sessionKeys = groupedEmails[0].sessions.map(
        (s) => `${firstDayKey}-${s.sessionId}`
      );
      setOpenSessions(new Set(sessionKeys));
    }
  }, [groupedEmails, openDays.size]);

  const toggleDay = (dayKey: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const toggleSession = (sessionKey: string) => {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) {
        next.delete(sessionKey);
      } else {
        next.add(sessionKey);
      }
      return next;
    });
  };

  const handleCancelEmail = async (emailId: string) => {
    setCancellingId(emailId);
    try {
      const response = await fetch(`/api/admin/emails/${emailId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel email");
      }

      toast.success("Email cancelled");
      mutateScheduled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel email");
    } finally {
      setCancellingId(null);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userType !== "staff") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Management</h1>
        <p className="text-muted-foreground">
          View and manage scheduled notification emails
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduled Emails
            {scheduledData?.total ? (
              <Badge variant="secondary" className="ml-1">
                {scheduledData.total}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview Templates
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Status</CardTitle>
              <CardDescription>
                Current configuration for Resend email service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {configError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Failed to load configuration
                </div>
              ) : !config ? (
                <div className="animate-pulse">Loading configuration...</div>
              ) : (
                <>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-3">
                    <Badge
                      variant={config.isEnabled ? "default" : "destructive"}
                      className={cn(
                        "gap-1",
                        config.isEnabled && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {config.isEnabled ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {config.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>

                    {config.isTestMode && (
                      <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        Test Mode Active
                      </Badge>
                    )}
                  </div>

                  {/* Test mode info */}
                  {config.isTestMode && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            Test Mode Enabled
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            All emails are redirected to:{" "}
                            <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">
                              {config.testRecipient || "Not configured"}
                            </code>
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                            Subject lines will be prefixed with [TEST] and include the original recipient.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Environment variables */}
                  <div>
                    <h3 className="font-medium mb-3">Environment Variables</h3>
                    <div className="space-y-2 font-mono text-sm">
                      {Object.entries(config.envVars).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <code className="text-muted-foreground">{key}:</code>
                          <code
                            className={cn(
                              "px-2 py-0.5 rounded",
                              value === "not set"
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                : "bg-slate-100 dark:bg-slate-800"
                            )}
                          >
                            {value}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* How to configure test mode */}
                  <div>
                    <h3 className="font-medium mb-3">How to Enable Test Mode</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Add these variables to your <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">.env.local</code> file:</p>
                      <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
{`EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-email@example.com`}
                      </pre>
                      <p>Restart your development server after making changes.</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Emails Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Emails</CardTitle>
                  <CardDescription>
                    Emails scheduled to be sent for upcoming and recent sessions
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutateScheduled()}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Failed to load scheduled emails
                </div>
              ) : !scheduledData || !scheduledData.emails ? (
                <div className="animate-pulse">Loading scheduled emails...</div>
              ) : scheduledData.emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled emails found</p>
                  <p className="text-sm">
                    Emails will appear here when sessions are created
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedEmails.map((dayGroup) => {
                    const dayKey = dayGroup.date.toISOString();
                    const isDayOpen = openDays.has(dayKey);

                    return (
                      <Collapsible
                        key={dayKey}
                        open={isDayOpen}
                        onOpenChange={() => toggleDay(dayKey)}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isDayOpen && "rotate-90"
                            )}
                          />
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{dayGroup.label}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {dayGroup.emailCount} email{dayGroup.emailCount !== 1 ? "s" : ""}
                          </Badge>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pl-4 mt-2 space-y-2">
                          {dayGroup.sessions.map((sessionGroup) => {
                            const sessionKey = `${dayKey}-${sessionGroup.sessionId}`;
                            const isSessionOpen = openSessions.has(sessionKey);

                            return (
                              <Collapsible
                                key={sessionKey}
                                open={isSessionOpen}
                                onOpenChange={() => toggleSession(sessionKey)}
                              >
                                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                  <ChevronRight
                                    className={cn(
                                      "h-3 w-3 text-muted-foreground transition-transform",
                                      isSessionOpen && "rotate-90"
                                    )}
                                  />
                                  <a
                                    href={`/sessions/${sessionGroup.sessionId}`}
                                    className="text-primary hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {sessionGroup.sessionType}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <span className="text-sm text-muted-foreground ml-auto">
                                    {sessionGroup.contacts.length} recipient{sessionGroup.contacts.length !== 1 ? "s" : ""}
                                  </span>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="pl-6 mt-1 space-y-1">
                                  {sessionGroup.contacts.map((contact) => (
                                    <div
                                      key={contact.recipient}
                                      className="flex items-start gap-3 p-2 rounded-md bg-slate-50/50 dark:bg-slate-900/50"
                                    >
                                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-mono text-sm truncate">
                                          {contact.recipient}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {contact.emails.map((email) => (
                                              <div
                                                key={email.emailId}
                                                className="flex items-center gap-1.5"
                                              >
                                                <Badge variant="outline" className="text-xs">
                                                  {getEmailTypeLabel(email.emailKey)}
                                                </Badge>
                                                {isRefreshing &&
                                                (email.status === "unknown" ||
                                                  email.status === "error") ? (
                                                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                                                ) : (
                                                  <Badge
                                                    variant={
                                                      email.status === "scheduled"
                                                        ? "outline"
                                                        : email.status === "delivered"
                                                        ? "default"
                                                        : email.status === "error"
                                                        ? "destructive"
                                                        : "secondary"
                                                    }
                                                    className={cn(
                                                      "text-xs",
                                                      email.status === "delivered" &&
                                                        "bg-green-600 hover:bg-green-700"
                                                    )}
                                                  >
                                                    {email.status}
                                                  </Badge>
                                                )}
                                                {email.scheduledFor && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {format(new Date(email.scheduledFor), "h:mm a")}
                                                  </span>
                                                )}
                                                {email.status === "scheduled" && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                                    onClick={() => handleCancelEmail(email.emailId)}
                                                    disabled={cancellingId === email.emailId}
                                                  >
                                                    {cancellingId === email.emailId ? (
                                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                      <XCircle className="h-3 w-3" />
                                                    )}
                                                  </Button>
                                                )}
                                              </div>
                                            ))}

                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Templates Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Prep Reminder</CardTitle>
                <CardDescription>
                  Sent 48h and 24h before sessions to students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href="/api/admin/emails/preview?template=meeting-prep&format=html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Immediate Feedback</CardTitle>
                <CardDescription>
                  Sent when session ends to all participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href="/api/admin/emails/preview?template=immediate-feedback&format=html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback Follow-up</CardTitle>
                <CardDescription>
                  Sent 24h after session if no feedback submitted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href="/api/admin/emails/preview?template=feedback-followup&format=html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
