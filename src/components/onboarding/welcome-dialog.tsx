"use client";

import { motion } from "framer-motion";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { OnboardingUserType } from "@/types/onboarding";

interface WelcomeDialogProps {
  /** Current user type */
  userType: OnboardingUserType;
  /** User's first name for personalized greeting */
  userName?: string;
  /** Callback when user chooses to start the tour */
  onStartTour?: () => void;
}

// Role-specific welcome content
const WELCOME_CONTENT = {
  student: {
    title: (name?: string) =>
      `Welcome to Mentor Hub${name ? `, ${name}` : ""}!`,
    description:
      "Your mentorship journey starts here. We'll help you make the most of your sessions, tasks, and feedback.",
    features: [
      "View and prepare for upcoming sessions",
      "Track tasks and action items",
      "Connect with your mentors",
      "Submit feedback to improve the program",
    ],
  },
  mentor: {
    title: () => "Welcome to Mentor Hub!",
    description:
      "Manage your mentorship sessions and track your teams' progress.",
    features: [
      "View your assigned teams and students",
      "Track session outcomes and action items",
      "Review and respond to feedback",
    ],
  },
  staff: {
    title: () => "Welcome to Mentor Hub!",
    description:
      "Full administrative access to manage the mentorship program.",
    features: [
      "Create and manage sessions across teams",
      "Monitor program-wide metrics",
      "Manage mentors, students, and teams",
    ],
  },
};

/**
 * WelcomeDialog - First-visit welcome modal
 *
 * Shows a personalized welcome message for new users.
 * Offers options to take a quick tour or skip.
 */
export function WelcomeDialog({
  userType,
  userName,
  onStartTour,
}: WelcomeDialogProps) {
  const { welcomeShown, markWelcomeShown, isLoading } = useOnboarding();

  // Only show for first-time users
  const shouldShow = !isLoading && !welcomeShown;

  const handleGetStarted = () => {
    markWelcomeShown();
    onStartTour?.();
  };

  const handleSkip = () => {
    markWelcomeShown();
  };

  const content = WELCOME_CONTENT[userType] || WELCOME_CONTENT.student;

  if (!shouldShow) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Rocket className="h-6 w-6 text-primary" />
            </motion.div>
          </div>
          <DialogTitle className="text-xl">
            {content.title(userName)}
          </DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="space-y-2">
            {content.features.map((feature, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleGetStarted}>
            Take a quick tour
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
