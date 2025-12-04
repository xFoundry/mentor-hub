"use client";

import { TeamMembersList } from "../../team-members-list";
import type { TeamTabBaseProps } from "./types";

interface TeamMembersTabProps extends TeamTabBaseProps {
  /** Handler for adding a new member */
  onAddMember?: () => void;
  /** Handler for removing a member */
  onRemoveMember?: (memberId: string, memberName: string) => void;
}

export function TeamMembersTab({
  team,
  userContext,
  userType,
  onAddMember,
  onRemoveMember,
}: TeamMembersTabProps) {
  const members = team.members || [];
  const isStaff = userType === "staff";

  return (
    <TeamMembersList
      members={members}
      userType={userType}
      currentUserEmail={userContext.email}
      variant="grid"
      showActions={isStaff}
      onAddMember={onAddMember}
      onRemoveMember={onRemoveMember}
      title="Team Members"
      description={isStaff ? "Manage team membership" : "Your team members"}
    />
  );
}
