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
import { Loader2, Save } from "lucide-react";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import type { Session } from "@/types/schema";

interface EditAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onSave: (agenda: string) => Promise<void>;
}

export function EditAgendaDialog({
  open,
  onOpenChange,
  session,
  onSave,
}: EditAgendaDialogProps) {
  const [agenda, setAgenda] = useState(session.agenda || "");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAgenda(session.agenda || "");
    }
  }, [open, session.agenda]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(agenda);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save agenda:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = agenda !== (session.agenda || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Agenda</DialogTitle>
          <DialogDescription>
            Update the agenda for this session. You can use formatting like bold, italic, lists, and links.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RichTextEditor
            value={agenda}
            onChange={setAgenda}
            placeholder="Enter the session agenda..."
            disabled={isSaving}
            size="lg"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Agenda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
