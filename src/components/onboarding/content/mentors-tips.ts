import type { PageTipsConfig } from "@/types/onboarding";

/**
 * Mentors page tips and tour for students
 */
export const mentorsTips: PageTipsConfig = {
  page: "/mentors",
  tips: [
    {
      id: "mentors-welcome",
      title: "Meet Your Mentors",
      content:
        "View information about mentors in your cohort. Learn about their expertise and how to connect with them.",
      variant: "card",
      userTypes: ["student"],
      priority: "high",
      dismissible: true,
    },
  ],
  tour: {
    id: "mentors-tour",
    name: "Mentors Tour",
    description: "Learn about your mentors",
    userTypes: ["student"],
    page: "/mentors",
    steps: [
      {
        id: "mentors-tour-header",
        targetSelector: "[data-tour='mentors-header']",
        title: "Your Mentors",
        content:
          "This page shows mentors in your cohort. Get to know them and learn from their expertise!",
        placement: "bottom",
      },
      {
        id: "mentors-tour-cards",
        targetSelector: "[data-tour='mentors-grid']",
        title: "Mentor Profiles",
        content:
          "Each card shows a mentor's background, expertise, and contact information. Click their LinkedIn or email to connect with them.",
        placement: "top",
        highlightAction: "Click a mentor's email to copy it",
      },
    ],
  },
};
