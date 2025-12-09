"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Link as LinkIcon } from "lucide-react";
import { useCreateMentor } from "@/hooks/use-create-mentor";
import { useCohorts } from "@/hooks/use-cohorts";
import { useCapacities } from "@/hooks/use-capacities";
import { useCohortContext } from "@/contexts/cohort-context";
import { ContactSearchCombobox } from "./contact-search-combobox";
import { MentorFormFields, type MentorFormValues } from "./mentor-form-fields";
import type { Contact, Cohort } from "@/types/schema";

interface AddMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCohortId?: string;
  onSuccess?: (contact: Contact) => void;
}

const emptyFormValues: MentorFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  bio: "",
  expertise: [],
  linkedIn: "",
  websiteUrl: "",
};

export function AddMentorDialog({
  open,
  onOpenChange,
  defaultCohortId,
  onSuccess,
}: AddMentorDialogProps) {
  const { selectedCohortId } = useCohortContext();
  const { cohorts } = useCohorts();
  const { capacities } = useCapacities();
  const { createMentor, isCreating } = useCreateMentor();

  // Form state
  const [mode, setMode] = useState<"link" | "create">("link");
  const [cohortId, setCohortId] = useState<string>("");
  const [capacityId, setCapacityId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [formValues, setFormValues] = useState<MentorFormValues>(emptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof MentorFormValues | "contact" | "cohort" | "capacity", string>>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      const initialCohortId = defaultCohortId || (selectedCohortId !== "all" ? selectedCohortId : "");
      setCohortId(initialCohortId);
      // Default to Mentor capacity
      const mentorCapacity = capacities.find((c) => c.name === "Mentor");
      setCapacityId(mentorCapacity?.id || "");
      setMode("link");
      setSelectedContactId("");
      setFormValues(emptyFormValues);
      setErrors({});
    }
  }, [open, defaultCohortId, selectedCohortId, capacities]);

  const handleFieldChange = useCallback((field: keyof MentorFormValues, value: any) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id);
    if (errors.contact) {
      setErrors((prev) => ({ ...prev, contact: undefined }));
    }
  }, [errors]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!cohortId) {
      newErrors.cohort = "Please select a cohort";
    }

    if (!capacityId) {
      newErrors.capacity = "Please select a capacity";
    }

    if (mode === "link") {
      if (!selectedContactId) {
        newErrors.contact = "Please select a contact";
      }
    } else {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Get the capacity name from the selected ID
    const selectedCapacity = capacities.find((c) => c.id === capacityId);
    const capacityName = selectedCapacity?.name || "Mentor";

    const result = await createMentor(
      mode === "link"
        ? {
            mode: "link",
            cohortId,
            capacityId,
            capacityName,
            contactId: selectedContactId,
          }
        : {
            mode: "create",
            cohortId,
            capacityId,
            capacityName,
            firstName: formValues.firstName.trim(),
            lastName: formValues.lastName.trim(),
            email: formValues.email.trim(),
            bio: formValues.bio.trim() || undefined,
            expertise: formValues.expertise.length > 0 ? formValues.expertise : undefined,
            linkedIn: formValues.linkedIn.trim() || undefined,
            websiteUrl: formValues.websiteUrl.trim() || undefined,
          }
    );

    if (result) {
      onSuccess?.(result.contact);
      onOpenChange(false);
    }
  };

  // Filter cohorts to only show active ones (exclude Complete and Closed)
  const activeCohorts = cohorts.filter(
    (c: Cohort) => c.status !== "Complete" && c.status !== "Closed"
  );

  return (
    <Dialog open={open} onOpenChange={isCreating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {isCreating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Adding participant...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Participant
          </DialogTitle>
          <DialogDescription>
            Add a participant to the cohort by linking an existing contact or creating a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cohort Selection */}
          <div className="space-y-2">
            <Label htmlFor="cohort">
              Cohort <span className="text-destructive">*</span>
            </Label>
            <Select
              value={cohortId}
              onValueChange={(value) => {
                setCohortId(value);
                if (errors.cohort) {
                  setErrors((prev) => ({ ...prev, cohort: undefined }));
                }
              }}
              disabled={isCreating}
            >
              <SelectTrigger id="cohort">
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                {activeCohorts.map((cohort: any) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.displayName || cohort.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cohort && (
              <p className="text-sm text-destructive">{errors.cohort}</p>
            )}
          </div>

          {/* Capacity Selection */}
          <div className="space-y-2">
            <Label htmlFor="capacity">
              Capacity <span className="text-destructive">*</span>
            </Label>
            <Select
              value={capacityId}
              onValueChange={(value) => {
                setCapacityId(value);
                if (errors.capacity) {
                  setErrors((prev) => ({ ...prev, capacity: undefined }));
                }
              }}
              disabled={isCreating}
            >
              <SelectTrigger id="capacity">
                <SelectValue placeholder="Select capacity" />
              </SelectTrigger>
              <SelectContent>
                {capacities.map((capacity) => (
                  <SelectItem key={capacity.id} value={capacity.id}>
                    {capacity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity}</p>
            )}
          </div>

          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "create")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link Existing
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Create New
              </TabsTrigger>
            </TabsList>

            {/* Link Existing Contact */}
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>
                  Select Contact <span className="text-destructive">*</span>
                </Label>
                <ContactSearchCombobox
                  value={selectedContactId}
                  onSelect={handleContactSelect}
                  cohortId={cohortId}
                  disabled={isCreating}
                />
                {errors.contact && (
                  <p className="text-sm text-destructive">{errors.contact}</p>
                )}
              </div>
            </TabsContent>

            {/* Create New Contact */}
            <TabsContent value="create" className="mt-4">
              <MentorFormFields
                values={formValues}
                onChange={handleFieldChange}
                errors={errors}
                disabled={isCreating}
                showNameFields={true}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Participant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
