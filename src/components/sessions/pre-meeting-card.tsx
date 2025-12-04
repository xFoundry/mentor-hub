"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  HelpCircle,
  MessageSquare,
  Link as LinkIcon,
  Clock,
  User,
} from "lucide-react";
import type { PreMeetingSubmission } from "@/types/schema";

interface PreMeetingCardProps {
  submission: PreMeetingSubmission;
}

export function PreMeetingCard({ submission }: PreMeetingCardProps) {
  const respondent = submission.respondant?.[0];
  const submittedDate = submission.submitted
    ? format(new Date(submission.submitted), "MMM d, yyyy 'at' h:mm a")
    : null;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasContent =
    submission.agendaItems ||
    submission.questions ||
    submission.topicsToDiscuss ||
    submission.materialsLinks;

  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={respondent?.headshot?.[0]?.url}
                alt={respondent?.fullName || "User"}
              />
              <AvatarFallback className="text-xs">
                {getInitials(respondent?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-medium">
                {respondent?.fullName || "Unknown User"}
              </CardTitle>
              {submittedDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  {submittedDate}
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Pre-Meeting Prep
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible defaultValue="agenda" className="w-full">
          {submission.agendaItems && (
            <AccordionItem value="agenda" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Agenda Items
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                  {submission.agendaItems}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {submission.questions && (
            <AccordionItem value="questions" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Questions
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                  {submission.questions}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {submission.topicsToDiscuss && (
            <AccordionItem value="topics" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Topics to Discuss
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                  {submission.topicsToDiscuss}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {submission.materialsLinks && (
            <AccordionItem value="materials" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  Materials & Links
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                  {submission.materialsLinks}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}

interface PreMeetingSubmissionsListProps {
  submissions: PreMeetingSubmission[];
  emptyMessage?: string;
}

export function PreMeetingSubmissionsList({
  submissions,
  emptyMessage = "No pre-meeting submissions yet",
}: PreMeetingSubmissionsListProps) {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <PreMeetingCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}
