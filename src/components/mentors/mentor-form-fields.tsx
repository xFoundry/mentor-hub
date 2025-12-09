"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExpertiseMultiSelect } from "./expertise-multi-select";

export interface MentorFormValues {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  expertise: string[];
  linkedIn: string;
  websiteUrl: string;
}

interface MentorFormFieldsProps {
  values: MentorFormValues;
  onChange: (field: keyof MentorFormValues, value: any) => void;
  errors?: Partial<Record<keyof MentorFormValues, string>>;
  disabled?: boolean;
  /** Whether to show name fields (for edit mode, we may use fullName instead) */
  showNameFields?: boolean;
}

export function MentorFormFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  showNameFields = true,
}: MentorFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Name Fields */}
      {showNameFields && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={values.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
              placeholder="John"
              disabled={disabled}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={values.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
              placeholder="Smith"
              disabled={disabled}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="john.smith@example.com"
          disabled={disabled}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={values.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="A brief professional bio..."
          rows={3}
          disabled={disabled}
        />
        {errors.bio && (
          <p className="text-sm text-destructive">{errors.bio}</p>
        )}
      </div>

      {/* Expertise */}
      <div className="space-y-2">
        <Label>Expertise</Label>
        <ExpertiseMultiSelect
          value={values.expertise}
          onChange={(value) => onChange("expertise", value)}
          disabled={disabled}
        />
        {errors.expertise && (
          <p className="text-sm text-destructive">{errors.expertise}</p>
        )}
      </div>

      {/* LinkedIn and Website */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedIn">LinkedIn URL</Label>
          <Input
            id="linkedIn"
            type="url"
            value={values.linkedIn}
            onChange={(e) => onChange("linkedIn", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            disabled={disabled}
          />
          {errors.linkedIn && (
            <p className="text-sm text-destructive">{errors.linkedIn}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            value={values.websiteUrl}
            onChange={(e) => onChange("websiteUrl", e.target.value)}
            placeholder="https://example.com"
            disabled={disabled}
          />
          {errors.websiteUrl && (
            <p className="text-sm text-destructive">{errors.websiteUrl}</p>
          )}
        </div>
      </div>
    </div>
  );
}
