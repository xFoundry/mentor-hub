import type { PageTipsConfig } from "@/types/onboarding";

/**
 * Tasks page tips and tour for students
 */
export const tasksTips: PageTipsConfig = {
  page: "/tasks",
  tips: [
    {
      id: "tasks-welcome",
      title: "Your Action Items",
      content:
        "Tasks help you track action items from your mentorship sessions. Keep them updated to show your progress!",
      variant: "card",
      userTypes: ["student"],
      priority: "high",
      dismissible: true,
    },
    {
      id: "tasks-kanban-tip",
      title: "Kanban View",
      content:
        "Try the Kanban view to see your tasks organized by status. Drag and drop tasks between columns to update their progress.",
      variant: "tooltip",
      userTypes: ["student"],
      priority: "medium",
      dismissible: true,
    },
  ],
  tour: {
    id: "tasks-tour",
    name: "Tasks Tour",
    description: "Learn how to track and manage your tasks",
    userTypes: ["student"],
    page: "/tasks",
    steps: [
      {
        id: "tasks-tour-header",
        targetSelector: "[data-tour='tasks-header']",
        title: "Your Action Items",
        content:
          "Tasks are action items from your mentorship sessions. Use this page to track what you need to do and show your progress.",
        placement: "bottom",
      },
      {
        id: "tasks-tour-views",
        targetSelector: "[data-tour='tasks-view-controls']",
        title: "Choose Your View",
        content:
          "Switch between Table, Kanban, or List views. Kanban is great for dragging tasks between status columns. Table shows all details at once.",
        placement: "bottom",
        highlightAction: "Try the Kanban view for visual task management",
      },
      {
        id: "tasks-tour-stats",
        targetSelector: "[data-tour='tasks-stats']",
        title: "Task Statistics",
        content:
          "See how many tasks you have in each status. Keep an eye on overdue tasks and try to minimize them!",
        placement: "bottom",
      },
      {
        id: "tasks-tour-create",
        targetSelector: "[data-tour='tasks-create-button']",
        title: "Add Your Own Tasks",
        content:
          "You can create your own tasks to track personal goals or action items you've committed to. Click here to add a new task.",
        placement: "bottom-start",
        highlightAction: "Click to create a new task",
      },
    ],
  },
};
