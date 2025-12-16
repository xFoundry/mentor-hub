"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { type UploadedFile } from "@/components/ui/file-upload";
import { useUploadFiles } from "@better-upload/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, UserPlus, Check, X, ChevronDown, Upload, Trash2, User, Building2, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact, Role, Organization } from "@/types/schema";
import {
  CONTACT_TYPE_OPTIONS,
  WEBFLOW_STATUS_OPTIONS,
  EXPERTISE_OPTIONS,
} from "@/hooks/use-contacts";
import { getAllOrganizations, updateRole } from "@/lib/baseql";
import { toast } from "sonner";

interface ContactEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact; // undefined = create mode
  onSave: (data: ContactFormData) => Promise<void>;
  onRoleUpdate?: (roleId: string, updates: { jobTitle?: string; organizationId?: string }) => Promise<void>;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  type?: string;
  expertise?: string[];
  linkedIn?: string;
  gitHub?: string;
  websiteUrl?: string;
  webflowStatus?: string;
  headshot?: { url: string; filename: string }[];
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Convert Airtable headshot format to UploadedFile format
 */
function headshotToUploadedFile(headshot?: any[]): UploadedFile[] {
  if (!headshot || headshot.length === 0) return [];
  return headshot.map((h) => {
    if (typeof h === "string") return { url: h, filename: "headshot" };
    return {
      url: h.url || h.thumbnails?.large?.url || "",
      filename: h.filename || "headshot",
      size: h.size,
      type: h.type,
    };
  });
}

/**
 * Convert UploadedFile format to Airtable attachment format
 */
function uploadedFileToHeadshot(
  files: UploadedFile[]
): { url: string; filename: string }[] {
  return files.map((f) => ({
    url: f.url,
    filename: f.filename,
  }));
}

/**
 * Headshot upload component with image preview
 */
interface HeadshotUploadProps {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  firstName?: string;
  lastName?: string;
}

function HeadshotUpload({
  value,
  onChange,
  disabled = false,
  firstName = "",
  lastName = "",
}: HeadshotUploadProps) {
  const { upload, reset, isPending, averageProgress } = useUploadFiles({
    route: "feedback-attachments",
    onUploadComplete: async ({ files }) => {
      const newFiles: UploadedFile[] = await Promise.all(
        files.map(async (f) => {
          try {
            const response = await fetch("/api/upload/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: f.objectInfo.key }),
            });

            if (!response.ok) {
              throw new Error("Failed to get presigned URL");
            }

            const { presignedUrl } = await response.json();

            return {
              url: presignedUrl,
              filename: f.raw.name,
              size: f.raw.size,
              type: f.raw.type,
            };
          } catch {
            return {
              url: `https://REDACTED_STORAGE_URL/${f.objectInfo.key}`,
              filename: f.raw.name,
              size: f.raw.size,
              type: f.raw.type,
            };
          }
        })
      );

      onChange(newFiles);
      reset();
    },
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        upload([files[0]]);
      }
      e.target.value = "";
    },
    [upload]
  );

  const handleRemove = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const currentHeadshot = value[0];
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";

  return (
    <div className="space-y-2">
      <Label>Headshot</Label>
      <div className="flex items-center gap-4">
        {/* Avatar Preview */}
        <Avatar className="h-20 w-20 border-2 border-muted">
          <AvatarImage
            src={currentHeadshot?.url}
            alt="Headshot preview"
            className="object-cover"
          />
          <AvatarFallback className="text-lg bg-muted">
            {initials || <User className="h-8 w-8 text-muted-foreground" />}
          </AvatarFallback>
        </Avatar>

        {/* Upload/Remove Controls */}
        <div className="flex flex-col gap-2">
          {currentHeadshot ? (
            <>
              <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                {currentHeadshot.filename}
              </p>
              <div className="flex gap-2">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={disabled || isPending}
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || isPending}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          {Math.round(averageProgress * 100)}%
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1 h-3 w-3" />
                          Change
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || isPending}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled || isPending}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isPending}
                asChild
              >
                <span className="cursor-pointer">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Uploading... {Math.round(averageProgress * 100)}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1 h-3 w-3" />
                      Upload photo
                    </>
                  )}
                </span>
              </Button>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Role card component for displaying and editing a single role
 */
interface RoleCardProps {
  role: Role;
  organizations: Array<{ id: string; organizationName?: string }>;
  onUpdate: (roleId: string, updates: { jobTitle?: string; organizationId?: string }) => Promise<void>;
  disabled?: boolean;
}

function RoleCard({ role, organizations, onUpdate, disabled = false }: RoleCardProps) {
  const [jobTitle, setJobTitle] = useState(role.jobTitle || "");
  const [organizationId, setOrganizationId] = useState(role.organization?.[0]?.id || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const originalJobTitle = role.jobTitle || "";
    const originalOrgId = role.organization?.[0]?.id || "";
    setHasChanges(jobTitle !== originalJobTitle || organizationId !== originalOrgId);
  }, [jobTitle, organizationId, role.jobTitle, role.organization]);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onUpdate(role.id, {
        jobTitle: jobTitle || undefined,
        organizationId: organizationId || undefined,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const currentOrg = organizations.find(o => o.id === organizationId);

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        {/* Job Title */}
        <div className="space-y-1.5">
          <Label htmlFor={`role-${role.id}-title`} className="text-xs flex items-center gap-1.5">
            <Briefcase className="h-3 w-3" />
            Job Title
          </Label>
          <Input
            id={`role-${role.id}-title`}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Enter job title"
            disabled={disabled || isSaving}
            className="h-9"
          />
        </div>

        {/* Organization */}
        <div className="space-y-1.5">
          <Label htmlFor={`role-${role.id}-org`} className="text-xs flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            Organization
          </Label>
          <Select
            value={organizationId}
            onValueChange={setOrganizationId}
            disabled={disabled || isSaving}
          >
            <SelectTrigger id={`role-${role.id}-org`} className="h-9">
              <SelectValue placeholder="Select organization">
                {currentOrg?.organizationName || "Select organization"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.organizationName || "Unnamed Organization"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save button - only show when there are changes */}
        {hasChanges && (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={disabled || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1 h-3 w-3" />
                  Save Role
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ContactEditSheet({
  open,
  onOpenChange,
  contact,
  onSave,
  onRoleUpdate,
}: ContactEditSheetProps) {
  const isEditMode = !!contact;

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [type, setType] = useState<string>("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [linkedIn, setLinkedIn] = useState("");
  const [gitHub, setGitHub] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [webflowStatus, setWebflowStatus] = useState<string>("");
  const [headshot, setHeadshot] = useState<UploadedFile[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);

  // Organizations for role editing (only loaded in edit mode)
  const [organizations, setOrganizations] = useState<Array<{ id: string; organizationName?: string }>>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Fetch organizations when sheet opens in edit mode with roles
  useEffect(() => {
    if (open && isEditMode && contact?.roles && contact.roles.length > 0) {
      setIsLoadingOrgs(true);
      getAllOrganizations()
        .then(({ organizations }) => setOrganizations(organizations))
        .catch((err) => {
          console.error("Failed to load organizations:", err);
          toast.error("Failed to load organizations");
        })
        .finally(() => setIsLoadingOrgs(false));
    }
  }, [open, isEditMode, contact?.roles]);

  // Handle role update
  const handleRoleUpdate = useCallback(async (
    roleId: string,
    updates: { jobTitle?: string; organizationId?: string }
  ) => {
    try {
      // Use the provided callback if available, otherwise call API directly
      if (onRoleUpdate) {
        await onRoleUpdate(roleId, updates);
      } else {
        // Direct API call
        await updateRole(roleId, {
          jobTitle: updates.jobTitle,
          organization: updates.organizationId ? [updates.organizationId] : undefined,
        });
        toast.success("Role updated");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
      throw error;
    }
  }, [onRoleUpdate]);

  // Reset form when sheet opens or contact changes
  useEffect(() => {
    if (open) {
      if (contact) {
        setFirstName(contact.firstName || "");
        setLastName(contact.lastName || "");
        setEmail(contact.email || "");
        setPhone(contact.phone || "");
        setBio(contact.bio || "");
        setType(contact.type || "");
        setExpertise(contact.expertise || []);
        setLinkedIn(contact.linkedIn || "");
        setGitHub(contact.gitHub || "");
        setWebsiteUrl(contact.websiteUrl || "");
        setWebflowStatus(contact.webflowStatus || "");
        setHeadshot(headshotToUploadedFile(contact.headshot));
      } else {
        // Reset to defaults for create mode
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setBio("");
        setType("Student");
        setExpertise([]);
        setLinkedIn("");
        setGitHub("");
        setWebsiteUrl("");
        setWebflowStatus("Draft");
        setHeadshot([]);
      }
      setErrors({});
    }
  }, [open, contact]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, email]);

  const handleExpertiseToggle = useCallback((value: string) => {
    setExpertise((prev) =>
      prev.includes(value)
        ? prev.filter((e) => e !== value)
        : [...prev, value]
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const formData: ContactFormData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        type: type || undefined,
        expertise: expertise.length > 0 ? expertise : undefined,
        linkedIn: linkedIn.trim() || undefined,
        gitHub: gitHub.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        webflowStatus: webflowStatus || undefined,
        headshot:
          headshot.length > 0 ? uploadedFileToHeadshot(headshot) : undefined,
      };

      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contact:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit Contact" : "Add Contact"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Update the contact's information below."
              : "Fill in the details to create a new contact."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4 px-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Basic Information
            </h3>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Profile
            </h3>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType} disabled={isSubmitting}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief description..."
                maxLength={1000}
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/1000
              </p>
            </div>

            {/* Expertise */}
            <div className="space-y-2">
              <Label>Expertise</Label>
              <Popover open={expertiseOpen} onOpenChange={setExpertiseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={expertiseOpen}
                    className="w-full justify-between"
                    disabled={isSubmitting}
                  >
                    <span className="truncate">
                      {expertise.length > 0
                        ? `${expertise.length} selected`
                        : "Select expertise..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search expertise..." />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No expertise found.</CommandEmpty>
                      <CommandGroup>
                        {EXPERTISE_OPTIONS.map((exp) => {
                          const isSelected = expertise.includes(exp);
                          return (
                            <CommandItem
                              key={exp}
                              value={exp}
                              onSelect={() => handleExpertiseToggle(exp)}
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <Check className="h-3 w-3" />
                              </div>
                              {exp}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {expertise.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {expertise.map((exp) => (
                    <Badge
                      key={exp}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleExpertiseToggle(exp)}
                    >
                      {exp}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Headshot with Preview */}
            <HeadshotUpload
              value={headshot}
              onChange={setHeadshot}
              disabled={isSubmitting}
              firstName={firstName}
              lastName={lastName}
            />
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Links</h3>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input
                id="linkedIn"
                type="url"
                value={linkedIn}
                onChange={(e) => setLinkedIn(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                disabled={isSubmitting}
              />
            </div>

            {/* GitHub */}
            <div className="space-y-2">
              <Label htmlFor="gitHub">GitHub</Label>
              <Input
                id="gitHub"
                type="url"
                value={gitHub}
                onChange={(e) => setGitHub(e.target.value)}
                placeholder="https://github.com/username"
                disabled={isSubmitting}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Status
            </h3>

            {/* Webflow Status */}
            <div className="space-y-2">
              <Label htmlFor="webflowStatus">Webflow Status</Label>
              <Select
                value={webflowStatus}
                onValueChange={setWebflowStatus}
                disabled={isSubmitting}
              >
                <SelectTrigger id="webflowStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {WEBFLOW_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Roles Section - Only shown in edit mode when contact has roles */}
          {isEditMode && contact?.roles && contact.roles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Roles ({contact.roles.length})
              </h3>

              {isLoadingOrgs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading organizations...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {contact.roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      organizations={organizations}
                      onUpdate={handleRoleUpdate}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <SheetFooter className="mt-4 p-0">
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
              ) : isEditMode ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Contact
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
