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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    teamName: string;
    description?: string;
    teamStatus?: string;
  };
  onSave: (updates: {
    teamName?: string;
    description?: string;
    teamStatus?: "Active" | "Inactive" | "Archived";
  }) => Promise<void>;
}

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  onSave,
}: EditTeamDialogProps) {
  const [teamName, setTeamName] = useState(team.teamName);
  const [description, setDescription] = useState(team.description || "");
  const [teamStatus, setTeamStatus] = useState(team.teamStatus || "Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ teamName?: string }>({});

  // Reset form when team changes or dialog opens
  useEffect(() => {
    if (open) {
      setTeamName(team.teamName);
      setDescription(team.description || "");
      setTeamStatus(team.teamStatus || "Active");
      setErrors({});
    }
  }, [open, team]);

  const validate = () => {
    const newErrors: { teamName?: string } = {};

    if (!teamName.trim()) {
      newErrors.teamName = "Team name is required";
    } else if (teamName.length > 100) {
      newErrors.teamName = "Team name must be 100 characters or less";
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
        teamName?: string;
        description?: string;
        teamStatus?: "Active" | "Inactive" | "Archived";
      } = {};

      // Only include changed fields
      if (teamName !== team.teamName) {
        updates.teamName = teamName.trim();
      }
      if (description !== (team.description || "")) {
        updates.description = description.trim() || undefined;
      }
      if (teamStatus !== team.teamStatus) {
        updates.teamStatus = teamStatus as "Active" | "Inactive" | "Archived";
      }

      // Only call save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team's details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="teamName">
              Team Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              maxLength={100}
              disabled={isSubmitting}
            />
            {errors.teamName && (
              <p className="text-sm text-destructive">{errors.teamName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {teamName.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
              <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter team description"
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="teamStatus">Status</Label>
            <Select
              value={teamStatus}
              onValueChange={setTeamStatus}
              disabled={isSubmitting}
            >
              <SelectTrigger id="teamStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
