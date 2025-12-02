"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileText, ScrollText } from "lucide-react";
import type { Session } from "@/types/schema";

interface AddMeetingNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onSave: (updates: {
    granolaNotesUrl?: string;
    summary?: string;
    fullTranscript?: string;
  }) => Promise<void>;
}

export function AddMeetingNotesDialog({
  open,
  onOpenChange,
  session,
  onSave,
}: AddMeetingNotesDialogProps) {
  const [granolaNotesUrl, setGranolaNotesUrl] = useState(session.granolaNotesUrl || "");
  const [summary, setSummary] = useState(session.summary || "");
  const [fullTranscript, setFullTranscript] = useState(session.fullTranscript || "");
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ granolaNotesUrl?: string }>({});

  // Reset form when session changes or dialog opens
  useEffect(() => {
    if (open) {
      setGranolaNotesUrl(session.granolaNotesUrl || "");
      setSummary(session.summary || "");
      setFullTranscript(session.fullTranscript || "");
      setActiveTab("summary");
      setErrors({});
    }
  }, [open, session]);

  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validate = () => {
    const newErrors: { granolaNotesUrl?: string } = {};

    if (granolaNotesUrl && !isValidUrl(granolaNotesUrl)) {
      newErrors.granolaNotesUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const updates: {
        granolaNotesUrl?: string;
        summary?: string;
        fullTranscript?: string;
      } = {};

      // Only include changed fields
      if (granolaNotesUrl !== (session.granolaNotesUrl || "")) {
        updates.granolaNotesUrl = granolaNotesUrl.trim() || undefined;
      }
      if (summary !== (session.summary || "")) {
        updates.summary = summary.trim() || undefined;
      }
      if (fullTranscript !== (session.fullTranscript || "")) {
        updates.fullTranscript = fullTranscript.trim() || undefined;
      }

      // Only call save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving meeting notes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasExistingNotes = session.summary || session.fullTranscript || session.granolaNotesUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {hasExistingNotes ? "Edit Meeting Notes" : "Add Meeting Notes"}
          </DialogTitle>
          <DialogDescription>
            Add the Granola notes URL, summary, and full transcript for this session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Granola Notes URL */}
          <div className="space-y-2">
            <Label htmlFor="granolaNotesUrl">
              Granola Notes URL
              <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
            </Label>
            <Input
              id="granolaNotesUrl"
              type="url"
              value={granolaNotesUrl}
              onChange={(e) => setGranolaNotesUrl(e.target.value)}
              placeholder="https://granola.ai/notes/..."
              disabled={isSubmitting}
            />
            {errors.granolaNotesUrl && (
              <p className="text-sm text-destructive">{errors.granolaNotesUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Link to the Granola notes page for this session
            </p>
          </div>

          {/* Tabs for Summary and Full Transcript */}
          <div className="space-y-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                  {summary && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({summary.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="transcript" className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  Full Transcript
                  {fullTranscript && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({fullTranscript.length})
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-2 mt-4">
                <Label htmlFor="summary">
                  Meeting Summary
                  <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                </Label>
                <RichTextEditor
                  value={summary}
                  onChange={setSummary}
                  placeholder="Enter the AI-generated summary of the meeting..."
                  disabled={isSubmitting}
                  showCharacterCount
                  size="default"
                />
              </TabsContent>

              <TabsContent value="transcript" className="space-y-2 mt-4">
                <Label htmlFor="fullTranscript">
                  Full Transcript
                  <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                </Label>
                <RichTextEditor
                  value={fullTranscript}
                  onChange={setFullTranscript}
                  placeholder="Paste the full meeting transcript here..."
                  disabled={isSubmitting}
                  showCharacterCount
                  size="lg"
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
