/**
 * Graphiti Service Client
 *
 * HTTP client for communicating with the Graphiti service on Railway.
 * Uses HMAC-SHA256 for request authentication.
 */

import crypto from "crypto";

// Environment configuration
const GRAPHITI_API_URL = process.env.GRAPHITI_API_URL;
const GRAPHITI_API_SECRET = process.env.GRAPHITI_API_SECRET;

/**
 * Generate HMAC-SHA256 signature for request authentication
 *
 * Format: HMAC-SHA256(timestamp + "." + body, secret)
 */
function generateSignature(
  timestamp: string,
  body: string
): string {
  if (!GRAPHITI_API_SECRET) {
    throw new Error("GRAPHITI_API_SECRET is not configured");
  }

  const payload = `${timestamp}.${body}`;
  return crypto
    .createHmac("sha256", GRAPHITI_API_SECRET)
    .update(payload)
    .digest("hex");
}

/**
 * Make an authenticated request to the Graphiti service
 */
async function graphitiFetch<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
    timeout?: number;
  } = {}
): Promise<T> {
  if (!GRAPHITI_API_URL) {
    throw new Error("GRAPHITI_API_URL is not configured");
  }

  const { method = "GET", body, timeout = 30000 } = options;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = body ? JSON.stringify(body) : "";
  const signature = generateSignature(timestamp, bodyString);

  const url = `${GRAPHITI_API_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Graphiti-Signature": signature,
        "X-Graphiti-Timestamp": timestamp,
      },
      body: bodyString || undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Graphiti API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Graphiti API timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// ============================================================================
// Health & Status
// ============================================================================

export interface HealthStatus {
  status: string;
  neo4j: string;
  timestamp: string;
  version: string;
}

export async function getGraphitiHealth(): Promise<HealthStatus> {
  return graphitiFetch<HealthStatus>("/health");
}

// ============================================================================
// Data Sync
// ============================================================================

export interface SyncResult {
  status: string;
  message: string;
  stats?: {
    contacts: number;
    teams: number;
    sessions: number;
    tasks: number;
    feedback: number;
  };
  duration_seconds?: number;
}

export interface TriggerSyncOptions {
  fullSync?: boolean;
  entities?: string[];
  cohortId?: string;
}

export async function triggerSync(
  options: TriggerSyncOptions = {}
): Promise<SyncResult> {
  return graphitiFetch<SyncResult>("/sync/trigger", {
    method: "POST",
    body: {
      full_sync: options.fullSync,
      entities: options.entities,
      cohort_id: options.cohortId,
    },
  });
}

export async function getSyncStatus(): Promise<{
  status: string;
  last_sync?: string;
  last_full_sync?: string;
  next_scheduled?: string;
}> {
  return graphitiFetch("/sync/status");
}

// ============================================================================
// Search & Query
// ============================================================================

export interface SearchResult {
  nodes: Array<{
    uuid: string;
    name: string;
    labels: string[];
    summary?: string;
  }>;
  edges: Array<{
    uuid: string;
    fact: string;
    name: string;
    source_entity: string;
    target_entity: string;
    created_at?: string;
  }>;
}

export interface SearchOptions {
  query: string;
  groupIds?: string[];
  entityTypes?: string[];
  maxResults?: number;
  includeEdges?: boolean;
}

export async function searchKnowledgeGraph(
  options: SearchOptions
): Promise<SearchResult> {
  return graphitiFetch<SearchResult>("/query/search", {
    method: "POST",
    body: {
      query: options.query,
      group_ids: options.groupIds,
      entity_types: options.entityTypes,
      max_results: options.maxResults ?? 10,
      include_edges: options.includeEdges ?? true,
    },
  });
}

// ============================================================================
// Mentor Recommendations
// ============================================================================

export interface MentorRecommendation {
  mentor: {
    id: string;
    fullName: string;
    email: string;
    headshot?: string;
    expertise: string[];
    bio?: string;
  };
  score: {
    total: number;
    expertiseMatch: number;
    availability: number;
    pastSuccess: number;
    diversity: number;
  };
  reasons: string[];
}

export interface RecommendationsResponse {
  teamName: string;
  recommendations: MentorRecommendation[];
  coverage: Record<string, number>;
  generatedAt: string;
}

export async function getMentorRecommendations(
  teamId: string,
  options: { limit?: number; includeAssigned?: boolean } = {}
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.includeAssigned) params.set("include_assigned", "true");

  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await graphitiFetch<{
    team_name: string;
    recommendations: Array<{
      mentor: {
        id: string;
        full_name: string;
        email: string;
        headshot?: string;
        expertise: string[];
        bio?: string;
      };
      score: {
        total: number;
        expertise_match: number;
        availability: number;
        past_success: number;
        diversity: number;
      };
      reasons: string[];
    }>;
    coverage: Record<string, number>;
    generated_at: string;
  }>(`/recommendations/mentors/${teamId}${query}`);

  // Transform snake_case to camelCase
  return {
    teamName: response.team_name,
    recommendations: response.recommendations.map((rec) => ({
      mentor: {
        id: rec.mentor.id,
        fullName: rec.mentor.full_name,
        email: rec.mentor.email,
        headshot: rec.mentor.headshot,
        expertise: rec.mentor.expertise,
        bio: rec.mentor.bio,
      },
      score: {
        total: rec.score.total,
        expertiseMatch: rec.score.expertise_match,
        availability: rec.score.availability,
        pastSuccess: rec.score.past_success,
        diversity: rec.score.diversity,
      },
      reasons: rec.reasons,
    })),
    coverage: response.coverage,
    generatedAt: response.generated_at,
  };
}

export async function updateTeamNeeds(
  teamId: string,
  needs: string[],
  options: { blockers?: string[]; priority?: string } = {}
): Promise<void> {
  await graphitiFetch(`/recommendations/mentors/${teamId}/needs`, {
    method: "POST",
    body: {
      needs,
      blockers: options.blockers,
      priority: options.priority,
    },
  });
}

export async function getMatchExplanation(
  teamId: string,
  mentorId: string
): Promise<{ teamId: string; mentorId: string; explanation: string }> {
  const response = await graphitiFetch<{
    team_id: string;
    mentor_id: string;
    explanation: string;
  }>(`/recommendations/mentors/${teamId}/explain/${mentorId}`);

  return {
    teamId: response.team_id,
    mentorId: response.mentor_id,
    explanation: response.explanation,
  };
}

// ============================================================================
// Team Health Analytics
// ============================================================================

export interface MetricScore {
  score: number;
  label: string;
  trend?: "up" | "down" | "stable";
  details?: Record<string, unknown>;
}

export interface TeamHealthMetrics {
  sessionFrequency: MetricScore;
  taskCompletion: MetricScore;
  engagement: MetricScore;
  progress: MetricScore;
}

export interface TeamHealth {
  teamId: string;
  teamName?: string;
  overallScore: number;
  status: "healthy" | "at-risk" | "needs-attention";
  metrics: TeamHealthMetrics;
  riskFactors: string[];
  recommendations: string[];
  lastUpdated: string;
}

export async function getTeamHealth(teamId: string): Promise<TeamHealth> {
  const response = await graphitiFetch<{
    team_name?: string;
    overall_score: number;
    status: string;
    metrics: {
      session_frequency: MetricScore;
      task_completion: MetricScore;
      engagement: MetricScore;
      progress: MetricScore;
    };
    risk_factors: string[];
    recommendations: string[];
    last_updated: string;
  }>(`/team-health/team/${teamId}`);

  return {
    teamId,
    teamName: response.team_name,
    overallScore: response.overall_score,
    status: response.status as TeamHealth["status"],
    metrics: {
      sessionFrequency: response.metrics.session_frequency,
      taskCompletion: response.metrics.task_completion,
      engagement: response.metrics.engagement,
      progress: response.metrics.progress,
    },
    riskFactors: response.risk_factors,
    recommendations: response.recommendations,
    lastUpdated: response.last_updated,
  };
}

export interface CohortHealthSummary {
  cohortId: string;
  cohortName?: string;
  teamCount: number;
  healthyCount: number;
  atRiskCount: number;
  needsAttentionCount: number;
  teams: TeamHealth[];
  overallHealth: number;
  commonIssues: string[];
}

export async function getCohortHealth(
  cohortId: string
): Promise<CohortHealthSummary> {
  const response = await graphitiFetch<{
    cohort_name?: string;
    team_count: number;
    healthy_count: number;
    at_risk_count: number;
    needs_attention_count: number;
    teams: Array<{
      team_id: string;
      team_name?: string;
      overall_score: number;
      status: string;
      metrics: {
        session_frequency: MetricScore;
        task_completion: MetricScore;
        engagement: MetricScore;
        progress: MetricScore;
      };
      risk_factors: string[];
      recommendations: string[];
      last_updated: string;
    }>;
    overall_health: number;
    common_issues: string[];
  }>(`/team-health/cohort/${cohortId}`);

  return {
    cohortId,
    cohortName: response.cohort_name,
    teamCount: response.team_count,
    healthyCount: response.healthy_count,
    atRiskCount: response.at_risk_count,
    needsAttentionCount: response.needs_attention_count,
    teams: response.teams.map((t) => ({
      teamId: t.team_id,
      teamName: t.team_name,
      overallScore: t.overall_score,
      status: t.status as TeamHealth["status"],
      metrics: {
        sessionFrequency: t.metrics.session_frequency,
        taskCompletion: t.metrics.task_completion,
        engagement: t.metrics.engagement,
        progress: t.metrics.progress,
      },
      riskFactors: t.risk_factors,
      recommendations: t.recommendations,
      lastUpdated: t.last_updated,
    })),
    overallHealth: response.overall_health,
    commonIssues: response.common_issues,
  };
}

export async function getAtRiskTeams(
  options: { cohortId?: string; threshold?: number } = {}
): Promise<{ count: number; threshold: number; teams: TeamHealth[] }> {
  const params = new URLSearchParams();
  if (options.cohortId) params.set("cohort_id", options.cohortId);
  if (options.threshold) params.set("threshold", options.threshold.toString());

  const query = params.toString() ? `?${params.toString()}` : "";

  return graphitiFetch(`/team-health/at-risk${query}`);
}

export interface HealthTrendPoint {
  date: string;
  score: number;
  status: string;
}

export async function getHealthTrend(
  teamId: string,
  days = 30
): Promise<{
  teamId: string;
  trend: HealthTrendPoint[];
  direction: "improving" | "declining" | "stable";
}> {
  const response = await graphitiFetch<{
    team_id: string;
    trend: HealthTrendPoint[];
    direction: string;
  }>("/team-health/trend", {
    method: "POST",
    body: { team_id: teamId, days },
  });

  return {
    teamId: response.team_id,
    trend: response.trend,
    direction: response.direction as "improving" | "declining" | "stable",
  };
}

// ============================================================================
// Feedback Insights
// ============================================================================

export interface FeedbackTheme {
  name: string;
  count: number;
  sentiment: "positive" | "neutral" | "negative";
  examples: string[];
  importance: number;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SessionInsights {
  sessionId: string;
  sessionDate?: string;
  feedbackCount: number;
  themes: FeedbackTheme[];
  sentiment: SentimentBreakdown;
  keyTakeaways: string[];
  actionItems: string[];
}

export async function getSessionInsights(
  sessionId: string
): Promise<SessionInsights> {
  const response = await graphitiFetch<{
    session_id: string;
    session_date?: string;
    feedback_count: number;
    themes: FeedbackTheme[];
    sentiment: SentimentBreakdown;
    key_takeaways: string[];
    action_items: string[];
  }>(`/insights/session/${sessionId}`);

  return {
    sessionId: response.session_id,
    sessionDate: response.session_date,
    feedbackCount: response.feedback_count,
    themes: response.themes,
    sentiment: response.sentiment,
    keyTakeaways: response.key_takeaways,
    actionItems: response.action_items,
  };
}

export interface CohortInsights {
  cohortId: string;
  cohortName?: string;
  sessionCount: number;
  feedbackCount: number;
  themes: FeedbackTheme[];
  overallSentiment: SentimentBreakdown;
  topInsights: string[];
  trendObservations: string[];
  generatedAt: string;
}

export async function getCohortInsights(
  cohortId: string
): Promise<CohortInsights> {
  const response = await graphitiFetch<{
    cohort_id: string;
    cohort_name?: string;
    session_count: number;
    feedback_count: number;
    themes: FeedbackTheme[];
    overall_sentiment: SentimentBreakdown;
    top_insights: string[];
    trend_observations: string[];
    generated_at: string;
  }>(`/insights/cohort/${cohortId}`);

  return {
    cohortId: response.cohort_id,
    cohortName: response.cohort_name,
    sessionCount: response.session_count,
    feedbackCount: response.feedback_count,
    themes: response.themes,
    overallSentiment: response.overall_sentiment,
    topInsights: response.top_insights,
    trendObservations: response.trend_observations,
    generatedAt: response.generated_at,
  };
}

export interface MentorInsights {
  mentorId: string;
  mentorName: string;
  sessionCount: number;
  feedbackCount: number;
  averageRating?: number;
  themes: FeedbackTheme[];
  strengths: string[];
  areasForImprovement: string[];
  sentimentTrend: "improving" | "declining" | "stable";
}

export async function getMentorInsights(
  mentorId: string,
  cohortId?: string
): Promise<MentorInsights> {
  const params = cohortId ? `?cohort_id=${cohortId}` : "";

  const response = await graphitiFetch<{
    mentor_id: string;
    mentor_name: string;
    session_count: number;
    feedback_count: number;
    average_rating?: number;
    themes: FeedbackTheme[];
    strengths: string[];
    areas_for_improvement: string[];
    sentiment_trend: string;
  }>(`/insights/mentor/${mentorId}${params}`);

  return {
    mentorId: response.mentor_id,
    mentorName: response.mentor_name,
    sessionCount: response.session_count,
    feedbackCount: response.feedback_count,
    averageRating: response.average_rating,
    themes: response.themes,
    strengths: response.strengths,
    areasForImprovement: response.areas_for_improvement,
    sentimentTrend: response.sentiment_trend as MentorInsights["sentimentTrend"],
  };
}

export interface TeamFeedbackInsights {
  teamId: string;
  teamName?: string;
  sessionCount: number;
  feedbackCount: number;
  themes: FeedbackTheme[];
  satisfactionTrend: "improving" | "declining" | "stable";
  commonBlockers: string[];
  progressIndicators: string[];
}

export async function getTeamFeedbackInsights(
  teamId: string
): Promise<TeamFeedbackInsights> {
  const response = await graphitiFetch<{
    team_id: string;
    team_name?: string;
    session_count: number;
    feedback_count: number;
    themes: FeedbackTheme[];
    satisfaction_trend: string;
    common_blockers: string[];
    progress_indicators: string[];
  }>(`/insights/team/${teamId}`);

  return {
    teamId: response.team_id,
    teamName: response.team_name,
    sessionCount: response.session_count,
    feedbackCount: response.feedback_count,
    themes: response.themes,
    satisfactionTrend: response.satisfaction_trend as TeamFeedbackInsights["satisfactionTrend"],
    commonBlockers: response.common_blockers,
    progressIndicators: response.progress_indicators,
  };
}
