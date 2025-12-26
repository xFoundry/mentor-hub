import type { PageTipsConfig } from "@/types/onboarding";

/**
 * Feedback page tips and tour for students
 */
export const feedbackTips: PageTipsConfig = {
  page: "/feedback",
  tips: [
    {
      id: "feedback-welcome",
      title: "Session Feedback",
      content:
        "Share your thoughts on mentorship sessions. Your feedback helps mentors improve and makes the program better for everyone!",
      variant: "card",
      userTypes: ["student"],
      priority: "high",
      dismissible: true,
    },
    {
      id: "feedback-importance",
      title: "Why Feedback Matters",
      content:
        "Feedback is a two-way street. Your honest reflections help mentors understand what's working and what could be improved.",
      variant: "banner",
      userTypes: ["student"],
      priority: "medium",
      dismissible: true,
    },
  ],
  tour: {
    id: "feedback-tour",
    name: "Feedback Tour",
    description: "Learn how to submit and view feedback",
    userTypes: ["student"],
    page: "/feedback",
    steps: [
      {
        id: "feedback-tour-header",
        targetSelector: "[data-tour='feedback-header']",
        title: "Session Feedback",
        content:
          "View all feedback from your mentorship sessions. See what you've submitted and any responses from mentors.",
        placement: "bottom",
      },
      {
        id: "feedback-tour-controls",
        targetSelector: "[data-tour='feedback-controls']",
        title: "View Options",
        content:
          "Switch between viewing feedback chronologically or grouped by session. Use the Add Feedback button to submit new feedback.",
        placement: "bottom-start",
        highlightAction: "Click Add Feedback to rate a session",
      },
      {
        id: "feedback-tour-feed",
        targetSelector: "[data-tour='feedback-feed']",
        title: "Feedback Feed",
        content:
          "See all feedback entries here. Each card shows feedback details including ratings, comments, and who submitted it. That's the tour - thanks for learning about feedback!",
        placement: "top",
      },
    ],
  },
};
