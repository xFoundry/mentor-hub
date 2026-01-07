"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserType } from "@/hooks/use-user-type";
import { useMentors, type MentorWithCohort } from "@/hooks/use-mentors";
import { useCohortContext } from "@/contexts/cohort-context";
import { Mail, Linkedin, ExternalLink, GraduationCap, Lightbulb, Copy, Check, UserPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddMentorDialog, EditMentorDialog } from "@/components/mentors";
import { PageTourWrapper } from "@/components/onboarding";
import type { Participation } from "@/types/schema";

export default function MentorsPage() {
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorWithCohort | null>(null);

  // Use selectedCohortId for staff, or user's own cohortId for others
  const cohortId = userType === "staff" ? selectedCohortId : userContext?.cohortId;
  const { mentors, isLoading: isMentorsLoading, mutate: mutateMentors } = useMentors(cohortId);

  const isStaff = userType === "staff";

  const handleCopyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const isLoading = isUserLoading || isMentorsLoading;

  const handleEditMentor = (mentor: MentorWithCohort) => {
    setSelectedMentor(mentor);
    setShowEditDialog(true);
  };

  const handleAddSuccess = () => {
    mutateMentors();
  };

  const handleEditSuccess = () => {
    mutateMentors();
    setSelectedMentor(null);
  };

  // Get participation for the current cohort context (for editing)
  const getParticipationForCohort = (mentor: MentorWithCohort): Participation | undefined => {
    if (!mentor.participations || mentor.participations.length === 0) return undefined;
    // If viewing a specific cohort, find that participation
    if (selectedCohortId && selectedCohortId !== "all") {
      const match = mentor.participations.find(p => p.cohortId === selectedCohortId);
      if (match) {
        return {
          id: match.participationId,
          status: match.status as any,
        };
      }
    }
    // Default to first participation
    const first = mentor.participations[0];
    return {
      id: first.participationId,
      status: first.status as any,
    };
  };

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="mentors-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentors</h1>
          <p className="text-muted-foreground mt-2">
            {selectedCohortId === "all"
              ? "Connect with mentors across all cohorts"
              : "Connect with mentors in your cohort"}
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Mentor
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="mt-4 h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">No mentors found</p>
              <p className="text-sm">Mentors will appear here once they're assigned to your cohort</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-tour="mentors-grid">
          {mentors.map((mentor) => {
            const initials = mentor.fullName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "M";

            return (
              <Card key={mentor.id} className="flex flex-col">
                <CardHeader className="overflow-hidden">
                  <div className="flex items-start gap-4 overflow-hidden">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={mentor.headshot?.[0]?.url} alt={mentor.fullName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg truncate">{mentor.fullName}</CardTitle>
                        {isStaff && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleEditMentor(mentor)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit {mentor.fullName}</span>
                          </Button>
                        )}
                      </div>
                      {mentor.email && (
                        <div
                          className="group flex items-center gap-1 text-sm text-muted-foreground cursor-pointer overflow-hidden hover:text-foreground transition-colors"
                          onClick={() => handleCopyEmail(mentor.email!)}
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{mentor.email}</span>
                          {copiedEmail === mentor.email ? (
                            <span className="flex items-center gap-1 shrink-0 text-green-600 dark:text-green-400">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Copied</span>
                            </span>
                          ) : (
                            <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Cohort Topics & Initiative */}
                  {mentor.cohorts && mentor.cohorts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {/* Show unique initiatives across all cohorts */}
                      {(() => {
                        const initiatives = mentor.cohorts
                          .flatMap(c => c.initiative || [])
                          .filter((init, idx, arr) => arr.findIndex(i => i.id === init.id) === idx);
                        return initiatives.map((init: { id: string; name: string }) => (
                          <Badge key={init.id} variant="default" className="text-xs">
                            <GraduationCap className="mr-1 h-3 w-3" />
                            {init.name}
                          </Badge>
                        ));
                      })()}
                      {/* Show unique topics across all cohorts (limit to 2) */}
                      {(() => {
                        const topics = mentor.cohorts
                          .flatMap(c => c.topics || [])
                          .filter((topic, idx, arr) => arr.findIndex(t => t.id === topic.id) === idx);
                        const displayTopics = topics.slice(0, 2);
                        const remainingCount = topics.length - 2;
                        return (
                          <>
                            {displayTopics.map((topic: { id: string; name: string }) => (
                              <Badge key={topic.id} variant="outline" className="text-xs">
                                <Lightbulb className="mr-1 h-3 w-3" />
                                {topic.name}
                              </Badge>
                            ))}
                            {remainingCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{remainingCount} topics
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {mentor.bio && (
                    <p className="text-muted-foreground text-sm line-clamp-3">{mentor.bio}</p>
                  )}

                  {mentor.expertise && mentor.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {mentor.expertise.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{mentor.expertise.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {mentor.linkedIn && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={mentor.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="mr-1 h-3 w-3" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    {mentor.websiteUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={mentor.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Mentor Dialog */}
      <AddMentorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultCohortId={selectedCohortId !== "all" ? selectedCohortId : undefined}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Mentor Dialog */}
      {selectedMentor && (
        <EditMentorDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) setSelectedMentor(null);
          }}
          contact={selectedMentor}
          participation={getParticipationForCohort(selectedMentor)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );

  // Wrap with tour for students
  if (userType === "student") {
    return (
      <PageTourWrapper userType="student" userName={userContext?.firstName}>
        {content}
      </PageTourWrapper>
    );
  }

  return content;
}
