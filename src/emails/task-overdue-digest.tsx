import { Section, Text, Hr, Row, Column } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface OverdueTask {
  id: string;
  name: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
}

interface TaskOverdueDigestProps {
  recipientName: string;
  tasks: OverdueTask[];
  tasksUrl: string;
}

/**
 * Daily digest of overdue tasks
 * Sent once daily if user has overdue tasks
 */
export function TaskOverdueDigestEmail({
  recipientName,
  tasks,
  tasksUrl,
}: TaskOverdueDigestProps) {
  const taskCount = tasks.length;
  const previewText = `You have ${taskCount} overdue task${taskCount !== 1 ? "s" : ""} that need attention`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>Overdue Tasks Reminder</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        You have <strong>{taskCount}</strong> task{taskCount !== 1 ? "s" : ""} past{" "}
        {taskCount !== 1 ? "their" : "its"} due date. Please take a moment to
        review and update your progress.
      </Text>

      <Section style={taskList}>
        <Text style={taskListHeading}>Overdue Tasks</Text>
        {tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            {index > 0 && <Hr style={taskDivider} />}
            <TaskRow task={task} />
          </React.Fragment>
        ))}
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={tasksUrl}>View All Tasks</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={tipText}>
        <strong>Tip:</strong> If you're blocked or need help with a task, reach out to
        your mentor or team lead. It's better to communicate early than to let
        tasks pile up.
      </Text>

      <Text style={footer}>
        Need to reschedule? Update the due date in the app to keep your task list
        accurate and manageable.
      </Text>
    </EmailLayout>
  );
}

/**
 * Individual task row in the list
 */
function TaskRow({ task }: { task: OverdueTask }) {
  const urgencyColor = task.daysOverdue > 7 ? "#dc2626" : task.daysOverdue > 3 ? "#f59e0b" : "#64748b";

  return (
    <Section style={taskRow}>
      <Row>
        <Column style={taskNameColumn}>
          <Text style={taskName}>{task.name}</Text>
          <Text style={taskMeta}>
            Due: {task.dueDate} ({task.daysOverdue} day{task.daysOverdue !== 1 ? "s" : ""} overdue)
          </Text>
        </Column>
        <Column style={taskBadgeColumn}>
          <Text style={{ ...taskBadge, backgroundColor: urgencyColor }}>
            {task.priority}
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

// Styles
const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "0 0 24px",
};

const paragraph: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#334155",
  margin: "0 0 16px",
};

const taskList: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #fecaca",
};

const taskListHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#991b1b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 16px",
};

const taskRow: React.CSSProperties = {
  padding: "12px 0",
};

const taskDivider: React.CSSProperties = {
  borderColor: "#fecaca",
  margin: "0",
};

const taskNameColumn: React.CSSProperties = {
  width: "80%",
};

const taskBadgeColumn: React.CSSProperties = {
  width: "20%",
  textAlign: "right" as const,
  verticalAlign: "top" as const,
};

const taskName: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 4px",
};

const taskMeta: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0",
};

const taskBadge: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#ffffff",
  padding: "4px 8px",
  borderRadius: "4px",
  display: "inline-block",
  margin: "0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const tipText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#334155",
  margin: "0 0 16px",
  padding: "16px",
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
};

const footer: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
  margin: "0",
  fontStyle: "italic",
};

export default TaskOverdueDigestEmail;
