"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Send } from "lucide-react";
import { RatingInput } from "./rating-input";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import type { SessionFeedback } from "@/types/schema";

// Single unified schema - we'll handle role-specific validation in the component
const feedbackSchema = z.object({
  role: z.enum(["Mentor", "Mentee"]),
  // Common fields
  whatWentWell: z.string().optional(),
  areasForImprovement: z.string().optional(),
  additionalNeeds: z.string().optional(),
  // Student fields
  rating: z.number().min(1).max(5).optional(),
  contentRelevance: z.number().min(1).max(5).optional(),
  actionabilityOfAdvice: z.number().min(1).max(5).optional(),
  mentorPreparedness: z.number().min(1).max(5).optional(),
  requestFollowUp: z.boolean().optional(),
  // Mentor fields
  menteeEngagement: z.number().min(1).max(5).optional(),
  suggestedNextSteps: z.string().optional(),
  privateNotes: z.string().optional(),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  userRole: "student" | "mentor" | "staff";
  existingFeedback?: SessionFeedback | null;
  onSubmit: (data: FeedbackFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  overrideRole?: "Mentor" | "Mentee";
}

export function FeedbackForm({
  userRole,
  existingFeedback,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onDirtyChange,
  overrideRole,
}: FeedbackFormProps) {
  // If overrideRole is provided (for staff), use that; otherwise determine from userRole
  const isStudent = overrideRole ? overrideRole === "Mentee" : userRole === "student";
  const feedbackRole = overrideRole || (isStudent ? "Mentee" : "Mentor");

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      role: feedbackRole,
      whatWentWell: existingFeedback?.whatWentWell || "",
      areasForImprovement: existingFeedback?.areasForImprovement || "",
      additionalNeeds: existingFeedback?.additionalNeeds || "",
      // Student fields
      rating: existingFeedback?.rating || undefined,
      contentRelevance: existingFeedback?.contentRelevance || undefined,
      actionabilityOfAdvice: existingFeedback?.actionabilityOfAdvice || undefined,
      mentorPreparedness: existingFeedback?.mentorPreparedness || undefined,
      requestFollowUp: existingFeedback?.requestFollowUp || false,
      // Mentor fields
      menteeEngagement: existingFeedback?.menteeEngagement || undefined,
      suggestedNextSteps: existingFeedback?.suggestedNextSteps || "",
      privateNotes: existingFeedback?.privateNotes || "",
    },
  });

  // Track form dirty state and notify parent
  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Update role when overrideRole changes
  useEffect(() => {
    if (overrideRole) {
      form.setValue("role", overrideRole);
    }
  }, [overrideRole, form]);

  const handleSubmit = async (data: FeedbackFormValues) => {
    // Validate that at least some feedback is provided
    const hasTextFeedback = data.whatWentWell || data.areasForImprovement || data.additionalNeeds;
    const hasRatings = isStudent ? data.rating : data.menteeEngagement;
    const hasSuggestedSteps = !isStudent && data.suggestedNextSteps;

    if (!hasTextFeedback && !hasRatings && !hasSuggestedSteps) {
      form.setError("root", {
        message: "Please provide at least one piece of feedback",
      });
      return;
    }

    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Student-specific rating fields */}
        {isStudent && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Rate Your Experience</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Overall Rating"
                      description="How would you rate this session overall?"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentRelevance"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Content Relevance"
                      description="How relevant was the content to your needs?"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actionabilityOfAdvice"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Actionability of Advice"
                      description="How actionable was the advice given?"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mentorPreparedness"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Mentor Preparedness"
                      description="How prepared was your mentor?"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Mentor/Staff-specific rating field */}
        {!isStudent && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Student Engagement</h3>
            <FormField
              control={form.control}
              name="menteeEngagement"
              render={({ field }) => (
                <FormItem>
                  <RatingInput
                    value={field.value}
                    onChange={field.onChange}
                    label="Mentee Engagement"
                    description="How engaged was the student during the session?"
                    disabled={isSubmitting}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* What Went Well */}
        <FormField
          control={form.control}
          name="whatWentWell"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                What Went Well
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={
                    isStudent
                      ? "What was most helpful about this session?"
                      : "What did the student do well? What progress have you noticed?"
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Areas for Improvement */}
        <FormField
          control={form.control}
          name="areasForImprovement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Areas for Improvement
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={
                    isStudent
                      ? "What could have been better? What would you like more of?"
                      : "What could the student work on? What challenges did you observe?"
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional Needs */}
        <FormField
          control={form.control}
          name="additionalNeeds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Additional Needs
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={
                    isStudent
                      ? "What additional support or resources would help you?"
                      : "What additional support or resources would be helpful for the student?"
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Student: Request Follow-up */}
        {isStudent && (
          <FormField
            control={form.control}
            name="requestFollowUp"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal cursor-pointer">
                    I would like to request a follow-up session
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Mentor: Suggested Next Steps */}
        {!isStudent && (
          <FormField
            control={form.control}
            name="suggestedNextSteps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Suggested Next Steps
                  <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="What actions should the student take before the next session?"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Mentor: Private Notes */}
        {!isStudent && (
          <FormField
            control={form.control}
            name="privateNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Private Notes
                  <span className="text-muted-foreground ml-1 font-normal">(Staff only)</span>
                </FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Internal notes not visible to students..."
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  These notes are only visible to staff and will not be shared with the student
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Form Error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {existingFeedback ? "Update Feedback" : "Submit Feedback"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
