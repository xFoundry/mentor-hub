"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditorViewer } from "@/components/editor";
import { FileText, ScrollText, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseAsLocalTime } from "./session-transformers";
import type { Session } from "@/types/schema";

interface ViewMeetingNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
}

export function ViewMeetingNotesDialog({
  open,
  onOpenChange,
  session,
}: ViewMeetingNotesDialogProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleCopy = async (content: string, tabName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(tabName);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formattedDate = session.scheduledStart
    ? format(parseAsLocalTime(session.scheduledStart), "MMMM d, yyyy")
    : "";

  const hasSummary = Boolean(session.summary);
  const hasTranscript = Boolean(session.fullTranscript);
  const defaultTab = hasSummary ? "summary" : "transcript";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Session Notes</DialogTitle>
          <DialogDescription>
            {session.sessionType} {formattedDate && `- ${formattedDate}`}
          </DialogDescription>
        </DialogHeader>

        {/* Granola Notes Link */}
        {session.granolaNotesUrl && (
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button variant="outline" size="sm" asChild>
              <a
                href={session.granolaNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                View in Granola
              </a>
            </Button>
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="summary"
              disabled={!hasSummary}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Summary
              {!hasSummary && (
                <span className="text-xs text-muted-foreground">(empty)</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              disabled={!hasTranscript}
              className="flex items-center gap-2"
            >
              <ScrollText className="h-4 w-4" />
              Full Transcript
              {!hasTranscript && (
                <span className="text-xs text-muted-foreground">(empty)</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 flex flex-col min-h-0 mt-4">
            {hasSummary ? (
              <>
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4">
                    <EditorViewer content={session.summary || ""} className="text-sm" />
                  </div>
                </ScrollArea>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-muted-foreground">
                    {session.summary?.length} characters
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(session.summary || "", "summary")}
                  >
                    {copiedTab === "summary" ? (
                      <>
                        <Check className="mr-2 h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No summary available
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="flex-1 flex flex-col min-h-0 mt-4">
            {hasTranscript ? (
              <>
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4">
                    <EditorViewer content={session.fullTranscript || ""} className="text-sm" />
                  </div>
                </ScrollArea>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-muted-foreground">
                    {session.fullTranscript?.length} characters
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(session.fullTranscript || "", "transcript")}
                  >
                    {copiedTab === "transcript" ? (
                      <>
                        <Check className="mr-2 h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No transcript available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
