import type { PageTipsConfig } from "@/types/onboarding";

/**
 * Sessions page tips and tour for students
 */
export const sessionsTips: PageTipsConfig = {
  page: "/sessions",
  tips: [
    {
      id: "sessions-welcome",
      title: "Your Sessions",
      content:
        "This page shows all your mentorship sessions. You can view upcoming sessions, past sessions, and filter by status.",
      variant: "card",
      userTypes: ["student"],
      priority: "high",
      dismissible: true,
    },
    {
      id: "sessions-feedback-prompt",
      title: "Share Feedback",
      content:
        "After each session, sharing feedback helps your mentors improve and shows your engagement with the program.",
      variant: "banner",
      userTypes: ["student"],
      priority: "medium",
      dismissible: true,
      action: {
        label: "Go to Feedback",
        href: "/feedback",
      },
    },
  ],
  tour: {
    id: "sessions-tour",
    name: "Sessions Tour",
    description: "Learn how to view and manage your sessions",
    userTypes: ["student"],
    page: "/sessions",
    steps: [
      {
        id: "sessions-tour-header",
        targetSelector: "[data-tour='sessions-header']",
        title: "Your Sessions",
        content:
          "This page shows all your mentorship sessions - upcoming, past, and any cancelled sessions.",
        placement: "bottom",
      },
      {
        id: "sessions-tour-view",
        targetSelector: "[data-tour='sessions-view-controls']",
        title: "View Controls",
        content:
          "Switch between different views - list, calendar, or cards. Filter and sort to find specific sessions quickly.",
        placement: "bottom",
        highlightAction: "Try switching views to find what works best for you",
      },
      {
        id: "sessions-tour-list",
        targetSelector: "[data-tour='sessions-list']",
        title: "Session List",
        content:
          "Click any session to see details including time, location, agenda, and any pre-meeting materials. You can also access feedback from here.",
        placement: "top",
        highlightAction: "Click a session to view its details",
      },
    ],
  },
};
