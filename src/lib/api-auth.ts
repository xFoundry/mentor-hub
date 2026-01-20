import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth0";
import { getUserByAuth0Id, getUserParticipation } from "@/lib/baseql";
import { mapCapacityToUserType, type Contact, type Participation, type UserType } from "@/types/schema";

const USER_TYPE_CACHE_TTL_MS = 5 * 60 * 1000;
const userTypeCache = new Map<string, { userType: UserType | "unknown"; expiresAt: number }>();

function getCachedUserType(key: string): UserType | "unknown" | undefined {
  const cached = userTypeCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt < Date.now()) {
    userTypeCache.delete(key);
    return undefined;
  }
  return cached.userType;
}

function setCachedUserType(key: string, userType: UserType | "unknown"): void {
  userTypeCache.set(key, {
    userType,
    expiresAt: Date.now() + USER_TYPE_CACHE_TTL_MS,
  });
}

export interface AuthSessionContext {
  email: string;
  auth0Id?: string;
  userType?: UserType;
}

function getCapacityName(participation: Participation): string | undefined {
  if (participation.capacityLink && participation.capacityLink.length > 0) {
    return participation.capacityLink[0]?.name;
  }
  return participation.capacity;
}

function resolveUserType(participation: Participation[]): UserType | undefined {
  const valid = participation.filter((p) => getCapacityName(p));
  if (valid.length === 0) return undefined;

  const capacityPriority: Record<string, number> = {
    Staff: 1,
    Mentor: 2,
    Participant: 3,
  };

  const sorted = [...valid].sort((a, b) => {
    const aCapacity = getCapacityName(a) || "";
    const bCapacity = getCapacityName(b) || "";
    const aPriority = capacityPriority[aCapacity] ?? 999;
    const bPriority = capacityPriority[bCapacity] ?? 999;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aInProgress = hasInProgressCohort(a);
    const bInProgress = hasInProgressCohort(b);
    if (aInProgress && !bInProgress) return -1;
    if (bInProgress && !aInProgress) return 1;

    if (a.status === "Active" && b.status !== "Active") return -1;
    if (b.status === "Active" && a.status !== "Active") return 1;

    return 0;
  });

  return mapCapacityToUserType(getCapacityName(sorted[0]));
}

function hasInProgressCohort(participation: Participation): boolean {
  return participation.cohorts?.some((cohort) => cohort.status === "In Progress") ?? false;
}

function resolveUserTypeFromContacts(contacts: Contact[]): UserType | undefined {
  if (contacts.length === 0) return undefined;
  const capacityPriority: Record<string, number> = {
    Staff: 1,
    Mentor: 2,
    Participant: 3,
  };

  const best = [...contacts]
    .filter((contact) => contact.type)
    .sort((a, b) => {
      const aPriority = capacityPriority[a.type ?? ""] ?? 999;
      const bPriority = capacityPriority[b.type ?? ""] ?? 999;
      return aPriority - bPriority;
    })[0];

  return best?.type ? mapCapacityToUserType(best.type) : undefined;
}

export async function requireAuthSession(): Promise<AuthSessionContext | NextResponse> {
  const session = await getAuthSession();
  const email = session?.user?.email?.toLowerCase().trim();
  const auth0Id = session?.user?.sub;

  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return { email, auth0Id };
}

export async function requireStaffSession(): Promise<AuthSessionContext | NextResponse> {
  const auth = await requireAuthSession();
  if (auth instanceof NextResponse) return auth;

  const cacheKey = auth.auth0Id || auth.email;
  const cachedUserType = cacheKey ? getCachedUserType(cacheKey) : undefined;
  if (cachedUserType) {
    if (cachedUserType !== "staff") {
      return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
    }
    return { ...auth, userType: "staff" };
  }

  let participation: Participation[] = [];
  let contacts: Contact[] = [];

  if (auth.auth0Id) {
    const auth0Result = await getUserByAuth0Id(auth.auth0Id);
    participation = auth0Result.participation || [];
    contacts = auth0Result.contacts || [];
  }

  if (participation.length === 0) {
    const emailResult = await getUserParticipation(auth.email);
    participation = emailResult.participation || [];
    if (emailResult.contact) {
      contacts = [emailResult.contact];
    }
  }

  let userType = resolveUserType(participation || []);
  if (!userType && contacts.length > 0) {
    userType = resolveUserTypeFromContacts(contacts);
  }

  if (cacheKey) {
    setCachedUserType(cacheKey, userType ?? "unknown");
  }

  if (userType !== "staff") {
    return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
  }

  return { ...auth, userType };
}

