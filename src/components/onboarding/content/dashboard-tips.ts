import type { PageTipsConfig } from "@/types/onboarding";

/**
 * Dashboard tips and tour for students
 *
 * Provides contextual help for the student dashboard including:
 * - Welcome tip card
 * - Stats explanations
 * - Feedback call-to-action
 * - Guided tour of key dashboard elements
 */
export const dashboardTips: PageTipsConfig = {
  page: "/dashboard",
  tips: [
    // Welcome tip card - high priority, shown at top
    {
      id: "dashboard-welcome",
      title: "Your Dashboard",
      content:
        "This is your central hub. See upcoming sessions, open tasks, and quick actions all in one place. You can dismiss this tip once you're familiar with the layout.",
      variant: "card",
      userTypes: ["student"],
      priority: "high",
      dismissible: true,
    },
    // Stats tooltips - help explain each stat
    {
      id: "dashboard-stats-sessions",
      title: "Session Stats",
      content:
        "Track your upcoming and completed mentorship sessions here. Click to view all your sessions.",
      variant: "tooltip",
      userTypes: ["student", "mentor"],
      priority: "medium",
      dismissible: false,
    },
    {
      id: "dashboard-stats-tasks",
      title: "Task Stats",
      content:
        "Your open tasks and overdue items. Keep an eye on these to stay on track with your action items!",
      variant: "tooltip",
      userTypes: ["student"],
      priority: "medium",
      dismissible: false,
    },
    {
      id: "dashboard-stats-feedback",
      title: "Feedback Stats",
      content:
        "Sessions that need your feedback. Sharing feedback helps mentors improve and shows your engagement.",
      variant: "tooltip",
      userTypes: ["student"],
      priority: "medium",
      dismissible: false,
    },
    // Feedback banner - encourage feedback submission
    {
      id: "dashboard-feedback-cta",
      title: "Share Your Experience",
      content:
        "Feedback helps mentors improve and makes the program better for everyone. Take a moment to rate your recent sessions.",
      variant: "banner",
      userTypes: ["student"],
      priority: "medium",
      dismissible: true,
      action: {
        label: "Give Feedback",
        href: "/feedback",
      },
    },
    // Quick actions popover
    {
      id: "dashboard-quick-actions",
      title: "Quick Actions",
      content:
        "Use these shortcuts to quickly navigate to common tasks like creating a new task or viewing your next session.",
      variant: "popover",
      userTypes: ["student"],
      priority: "low",
      dismissible: true,
    },
  ],
  tour: {
    id: "dashboard-tour",
    name: "Dashboard Tour",
    description: "Learn how to navigate your dashboard",
    userTypes: ["student"],
    page: "/dashboard",
    steps: [
      {
        id: "tour-welcome",
        targetSelector: "[data-tour='welcome-header']",
        title: "Welcome to Your Dashboard",
        content:
          "This is your personalized dashboard. It shows the most important information at a glance, tailored to your mentorship journey.",
        placement: "bottom",
      },
      {
        id: "tour-next-session",
        targetSelector: "[data-tour='next-session']",
        title: "Your Next Session",
        content:
          "See your upcoming session details here. This card shows when your next mentorship session is scheduled and who you'll be meeting with.",
        placement: "bottom",
        highlightAction: "Click to see full session details",
      },
      {
        id: "tour-stats",
        targetSelector: "[data-tour='stats-grid']",
        title: "Your Stats at a Glance",
        content:
          "These cards show your key metrics - upcoming sessions, open tasks, feedback needed, and completed sessions. Click any card to dive deeper.",
        placement: "bottom",
      },
      {
        id: "tour-tasks",
        targetSelector: "[data-tour='tasks-section']",
        title: "Your Action Items",
        content:
          "Tasks assigned to you appear here. Keep them updated to show your progress and stay accountable to your goals!",
        placement: "top",
      },
      {
        id: "tour-quick-actions",
        targetSelector: "[data-tour='quick-actions']",
        title: "Quick Actions",
        content:
          "Use these shortcuts for common actions like adding a task, viewing sessions, or preparing for your next meeting. That's the tour - you're all set!",
        placement: "top",
      },
    ],
  },
};
