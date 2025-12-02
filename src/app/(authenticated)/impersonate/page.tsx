"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getImpersonatableContacts } from "@/lib/baseql";
import { useUserType } from "@/hooks/use-user-type";
import { useImpersonation } from "@/contexts/impersonation-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserCircle, AlertTriangle, Users, GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Staff-only page for selecting a user to impersonate
 */
export default function ImpersonatePage() {
  const router = useRouter();
  const { userType, isLoading: isUserLoading } = useUserType();
  const { startImpersonation, isLoading: isImpersonating, error } = useImpersonation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Fetch all impersonatable contacts
  const { data, isLoading: isContactsLoading } = useSWR(
    "/api/impersonatable-contacts",
    async () => {
      const result = await getImpersonatableContacts();
      return result.contacts;
    }
  );

  const contacts = data || [];

  // Filter contacts by search term and role
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Search filter
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        contact.fullName?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term);

      // Role filter
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "mentor" && contact.participationRole === "Mentor") ||
        (roleFilter === "student" && contact.participationRole === "Student");

      return matchesSearch && matchesRole;
    });
  }, [contacts, searchTerm, roleFilter]);

  // Handle impersonation
  const handleImpersonate = async (email: string) => {
    try {
      await startImpersonation(email);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to start impersonation:", err);
    }
  };

  // Redirect non-staff users
  if (!isUserLoading && userType !== "staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          Only staff members can access this page.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const isLoading = isUserLoading || isContactsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impersonate User</h1>
        <p className="text-muted-foreground mt-2">
          View the application as another user to assist with support or testing.
          Your impersonation will end when you refresh the page or click the exit button.
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>
            Choose a mentor or student to view as. You&apos;ll see exactly what they see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="mentor">Mentors Only</SelectItem>
                <SelectItem value="student">Students Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredContacts.map((contact) => {
                const initials = contact.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?";
                const avatarUrl = contact.headshot?.[0]?.url;
                const isMentor = contact.participationRole === "Mentor";

                return (
                  <button
                    key={contact.id}
                    onClick={() => contact.email && handleImpersonate(contact.email)}
                    disabled={isImpersonating || !contact.email}
                    className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <Avatar className="h-10 w-10">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={contact.fullName || ""} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.fullName || contact.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isMentor ? "secondary" : "default"}
                        className="flex items-center gap-1"
                      >
                        {isMentor ? (
                          <Users className="h-3 w-3" />
                        ) : (
                          <GraduationCap className="h-3 w-3" />
                        )}
                        {contact.participationRole}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t text-sm text-muted-foreground">
            {filteredContacts.length} user{filteredContacts.length !== 1 ? "s" : ""} available
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
