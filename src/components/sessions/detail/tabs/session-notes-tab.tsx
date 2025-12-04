"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  ExternalLink,
  Copy,
  Check,
  AlignLeft,
  MessageSquareText,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditorViewer } from "@/components/editor";
import type { Session } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface SessionNotesTabProps {
  session: Session;
  userType: UserType;
  /** Callback to open notes editor (staff only) */
  onEditNotes?: () => void;
}

export function SessionNotesTab({
  session,
  userType,
  onEditNotes,
}: SessionNotesTabProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const isStaff = userType === "staff";
  const hasNotes = session.summary || session.fullTranscript;
  const hasBothSections = session.summary && session.fullTranscript;

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!hasNotes) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="font-medium">No meeting notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isStaff
              ? "Add notes after the session is completed"
              : "Meeting notes will be available after the session"}
          </p>
          {isStaff && (
            <Button onClick={onEditNotes} className="mt-4" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Add Notes
            </Button>
          )}
          {session.granolaNotesUrl && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <a href={session.granolaNotesUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Granola
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Meeting Notes</h3>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button variant="outline" size="sm" onClick={onEditNotes}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Notes
            </Button>
          )}
          {session.granolaNotesUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={session.granolaNotesUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Granola
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Notes content */}
      {hasBothSections ? (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="gap-2">
              <AlignLeft className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              Transcript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <NotesSection
              title="Summary"
              content={session.summary!}
              icon={AlignLeft}
              onCopy={() => handleCopy(session.summary!, "summary")}
              isCopied={copiedSection === "summary"}
            />
          </TabsContent>

          <TabsContent value="transcript">
            <NotesSection
              title="Full Transcript"
              content={session.fullTranscript!}
              icon={MessageSquareText}
              onCopy={() => handleCopy(session.fullTranscript!, "transcript")}
              isCopied={copiedSection === "transcript"}
              isLong
            />
          </TabsContent>
        </Tabs>
      ) : (
        <NotesSection
          title={session.summary ? "Summary" : "Transcript"}
          content={session.summary || session.fullTranscript || ""}
          icon={session.summary ? AlignLeft : MessageSquareText}
          onCopy={() => handleCopy(
            session.summary || session.fullTranscript || "",
            session.summary ? "summary" : "transcript"
          )}
          isCopied={copiedSection !== null}
          isLong={!session.summary}
        />
      )}
    </div>
  );
}

/**
 * Individual notes section card
 */
function NotesSection({
  title,
  content,
  icon: Icon,
  onCopy,
  isCopied,
  isLong = false,
}: {
  title: string;
  content: string;
  icon: React.ElementType;
  onCopy: () => void;
  isCopied: boolean;
  isLong?: boolean;
}) {
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {wordCount.toLocaleString()} words
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 w-8 p-0"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          {charCount.toLocaleString()} characters
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLong ? (
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <EditorViewer
              content={content}
              className="text-sm text-muted-foreground leading-relaxed pr-4 prose prose-sm dark:prose-invert max-w-none"
            />
          </ScrollArea>
        ) : (
          <div className="rounded-md border p-4">
            <EditorViewer
              content={content}
              className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
