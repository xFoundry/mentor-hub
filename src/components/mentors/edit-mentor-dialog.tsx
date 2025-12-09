"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, UserCog } from "lucide-react";
import { useUpdateMentor } from "@/hooks/use-update-mentor";
import { MentorFormFields, type MentorFormValues } from "./mentor-form-fields";
import type { Contact, Participation } from "@/types/schema";

const PARTICIPATION_STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Left", label: "Left" },
  { value: "Removed", label: "Removed" },
  { value: "Pending", label: "Pending" },
];

interface EditMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The contact record for the mentor */
  contact: Contact;
  /** The participation record (for status updates) */
  participation?: Participation;
  onSuccess?: (contact: Contact) => void;
}

export function EditMentorDialog({
  open,
  onOpenChange,
  contact,
  participation,
  onSuccess,
}: EditMentorDialogProps) {
  const { updateMentor, isUpdating } = useUpdateMentor();

  // Parse fullName into firstName/lastName if individual fields not available
  const parseFullName = (fullName?: string): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }
    const lastName = parts.pop() || "";
    const firstName = parts.join(" ");
    return { firstName, lastName };
  };

  // Initialize form values from contact
  const getInitialFormValues = useCallback((): MentorFormValues => {
    const parsed = parseFullName(contact.fullName);
    return {
      firstName: contact.firstName || parsed.firstName,
      lastName: contact.lastName || parsed.lastName,
      email: contact.email || "",
      bio: contact.bio || "",
      expertise: contact.expertise || [],
      linkedIn: contact.linkedIn || "",
      websiteUrl: contact.websiteUrl || "",
    };
  }, [contact]);

  // Form state
  const [formValues, setFormValues] = useState<MentorFormValues>(getInitialFormValues);
  const [status, setStatus] = useState<string>(participation?.status || "Active");
  const [errors, setErrors] = useState<Partial<Record<keyof MentorFormValues | "status", string>>>({});

  // Track if dialog was previously open to detect fresh opens
  const wasOpen = useRef(false);

  // Reset form only when dialog first opens (not on every render while open)
  useEffect(() => {
    if (open && !wasOpen.current) {
      // Dialog just opened - initialize form
      setFormValues(getInitialFormValues());
      setStatus(participation?.status || "Active");
      setErrors({});
    }
    wasOpen.current = open;
  }, [open, getInitialFormValues, participation?.status]);

  const handleFieldChange = useCallback((field: keyof MentorFormValues, value: any) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formValues.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formValues.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formValues.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasChanges = (): boolean => {
    const initial = getInitialFormValues();
    const initialStatus = participation?.status || "Active";

    return (
      formValues.firstName.trim() !== initial.firstName ||
      formValues.lastName.trim() !== initial.lastName ||
      formValues.email.trim() !== initial.email ||
      formValues.bio.trim() !== initial.bio ||
      JSON.stringify(formValues.expertise) !== JSON.stringify(initial.expertise) ||
      formValues.linkedIn.trim() !== initial.linkedIn ||
      formValues.websiteUrl.trim() !== initial.websiteUrl ||
      status !== initialStatus
    );
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // If no changes, just close
    if (!hasChanges()) {
      onOpenChange(false);
      return;
    }

    const initial = getInitialFormValues();
    const initialStatus = participation?.status || "Active";

    // Build updates object with only changed fields
    const updates: {
      contactId: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      bio?: string;
      expertise?: string[];
      linkedIn?: string;
      websiteUrl?: string;
      participationId?: string;
      status?: string;
    } = {
      contactId: contact.id,
    };

    if (formValues.firstName.trim() !== initial.firstName) {
      updates.firstName = formValues.firstName.trim();
    }
    if (formValues.lastName.trim() !== initial.lastName) {
      updates.lastName = formValues.lastName.trim();
    }
    if (formValues.email.trim() !== initial.email) {
      updates.email = formValues.email.trim();
    }
    if (formValues.bio.trim() !== initial.bio) {
      updates.bio = formValues.bio.trim() || undefined;
    }
    if (JSON.stringify(formValues.expertise) !== JSON.stringify(initial.expertise)) {
      updates.expertise = formValues.expertise.length > 0 ? formValues.expertise : undefined;
    }
    if (formValues.linkedIn.trim() !== initial.linkedIn) {
      updates.linkedIn = formValues.linkedIn.trim() || undefined;
    }
    if (formValues.websiteUrl.trim() !== initial.websiteUrl) {
      updates.websiteUrl = formValues.websiteUrl.trim() || undefined;
    }

    // Include participation updates if status changed
    if (participation && status !== initialStatus) {
      updates.participationId = participation.id;
      updates.status = status;
    }

    const result = await updateMentor(updates);

    if (result) {
      if (result.contact) {
        onSuccess?.(result.contact);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isUpdating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {isUpdating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Saving changes...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit Mentor
          </DialogTitle>
          <DialogDescription>
            Update mentor information and participation status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Participation Status */}
          {participation && (
            <div className="space-y-2">
              <Label htmlFor="status">Participation Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={isUpdating}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contact Form Fields */}
          <MentorFormFields
            values={formValues}
            onChange={handleFieldChange}
            errors={errors}
            disabled={isUpdating}
            showNameFields={true}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating || !hasChanges()}>
            {isUpdating ? (
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
      </DialogContent>
    </Dialog>
  );
}
