"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Activity,
  RefreshCw,
  Play,
  Loader2,
  Server,
  Search,
  Brain,
  Users,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useUserType } from "@/hooks/use-user-type";
import { cn } from "@/lib/utils";

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

interface OutlineCollection {
  id: string;
  name: string;
  description?: string;
  document_count?: number;
}

interface EndpointConfig {
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  requiresInput?: {
    key: string;
    label: string;
    placeholder: string;
    selectFromCollections?: boolean;
  };
}

type ServiceType = "graphiti" | "cognee";

// =============================================================================
// GRAPHITI ENDPOINTS
// =============================================================================

const GRAPHITI_ENDPOINT_GROUPS: Record<string, { title: string; description: string; endpoints: EndpointConfig[] }> = {
  health: {
    title: "Health & Status",
    description: "Check Graphiti service health and status",
    endpoints: [
      {
        name: "Liveness Check",
        description: "Quick check if service is alive (no DB connection)",
        endpoint: "/live",
        method: "GET",
      },
      {
        name: "Health Check",
        description: "Full health check including FalkorDB connection",
        endpoint: "/health",
        method: "GET",
      },
      {
        name: "Readiness Check",
        description: "Check if service is ready to accept traffic",
        endpoint: "/ready",
        method: "GET",
      },
      {
        name: "Graph Stats",
        description: "Get node/edge counts and sample data from the graph",
        endpoint: "/graph-stats",
        method: "GET",
      },
    ],
  },
  airtableSync: {
    title: "Airtable Sync",
    description: "Sync data from Airtable/BaseQL to the knowledge graph",
    endpoints: [
      {
        name: "Full Sync",
        description: "Trigger a full sync of all Airtable data (runs in background)",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { full_sync: true },
      },
      {
        name: "Sync Status",
        description: "Get current sync status and statistics",
        endpoint: "/sync/test-status",
        method: "GET",
      },
      {
        name: "Sync Cohorts",
        description: "Sync only cohort data",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { entities: ["cohorts"] },
      },
      {
        name: "Sync Contacts",
        description: "Sync only contact data",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { entities: ["contacts"] },
      },
      {
        name: "Sync Sessions",
        description: "Sync only session data",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { entities: ["sessions"] },
      },
      {
        name: "Sync Teams",
        description: "Sync only team data",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { entities: ["teams"] },
      },
      {
        name: "Sync Tasks",
        description: "Sync only task data",
        endpoint: "/sync/test-trigger",
        method: "POST",
        body: { entities: ["tasks"] },
      },
      {
        name: "Clear Graph",
        description: "DELETE all nodes and edges from the graph (use before full re-sync)",
        endpoint: "/sync/test-clear",
        method: "POST",
      },
    ],
  },
  outlineSync: {
    title: "Outline Docs Sync",
    description: "Sync documentation from Outline to the knowledge graph",
    endpoints: [
      {
        name: "List Collections",
        description: "List all available Outline collections",
        endpoint: "/outline/test-collections",
        method: "GET",
      },
      {
        name: "List Documents in Collection",
        description: "List all documents in a specific collection",
        endpoint: "/outline/test-collections/{collection_id}/documents",
        method: "GET",
        requiresInput: {
          key: "collection_id",
          label: "Collection",
          placeholder: "Select a collection...",
          selectFromCollections: true,
        },
      },
      {
        name: "Full Outline Sync",
        description: "Sync all collections and documents from Outline (runs in background)",
        endpoint: "/outline/test-full-sync",
        method: "POST",
      },
      {
        name: "Outline Status",
        description: "Get Outline sync status",
        endpoint: "/outline/test-status",
        method: "GET",
      },
    ],
  },
  query: {
    title: "Knowledge Graph Query",
    description: "Search and query the Graphiti knowledge graph",
    endpoints: [
      {
        name: "Search Graph",
        description: "Search the knowledge graph for entities and relationships",
        endpoint: "/query/search",
        method: "POST",
        requiresInput: {
          key: "query",
          label: "Search Query",
          placeholder: "Enter search query...",
        },
      },
      {
        name: "Search Entities",
        description: "Search for entities (people, teams, docs, etc.) by name/summary text",
        endpoint: "/query/entities",
        method: "POST",
        requiresInput: {
          key: "search_text",
          label: "Search Text",
          placeholder: "Enter name or keywords...",
        },
      },
    ],
  },
};

// =============================================================================
// COGNEE ENDPOINTS
// =============================================================================

const COGNEE_ENDPOINT_GROUPS: Record<string, { title: string; description: string; endpoints: EndpointConfig[] }> = {
  health: {
    title: "Health & Status",
    description: "Check Cognee service health and connectivity",
    endpoints: [
      {
        name: "Liveness Check",
        description: "Quick check if service is alive",
        endpoint: "/live",
        method: "GET",
      },
      {
        name: "Health Check",
        description: "Full health check including Neo4j and Postgres",
        endpoint: "/health",
        method: "GET",
      },
      {
        name: "Readiness Check",
        description: "Check if service is ready to accept traffic",
        endpoint: "/ready",
        method: "GET",
      },
    ],
  },
  sync: {
    title: "Data Sync",
    description: "Sync Airtable data to Cognee knowledge graph",
    endpoints: [
      {
        name: "Prune All Data",
        description: "DELETE all data from the knowledge graph (use before fresh sync)",
        endpoint: "/sync/prune",
        method: "POST",
      },
      {
        name: "Prose Sync (Recommended)",
        description: "Full sync with prose-based ingestion, embeddings, and relationship weights",
        endpoint: "/sync/trigger",
        method: "POST",
        body: { mode: "prose", run_cognify: true, run_memify: true },
      },
      {
        name: "Hybrid Sync",
        description: "Structured + LLM extraction mode",
        endpoint: "/sync/trigger",
        method: "POST",
        body: { mode: "hybrid", run_cognify: true, run_memify: true },
      },
      {
        name: "Simple Sync",
        description: "Direct entity insertion without LLM processing",
        endpoint: "/sync/trigger",
        method: "POST",
        body: { mode: "simple", run_cognify: true, run_memify: false },
      },
      {
        name: "List Sync Jobs",
        description: "List all sync jobs and their statuses",
        endpoint: "/sync/jobs",
        method: "GET",
      },
    ],
  },
  search: {
    title: "Knowledge Graph Search",
    description: "Search the Cognee knowledge graph with multiple search types",
    endpoints: [
      {
        name: "Graph Search",
        description: "Search using graph completion (relationships + LLM)",
        endpoint: "/search",
        method: "POST",
        requiresInput: {
          key: "query",
          label: "Search Query",
          placeholder: "Who are the mentors for team DefenX?",
        },
      },
      {
        name: "Natural Language Query",
        description: "Ask a question and get a synthesized answer with sources",
        endpoint: "/query",
        method: "POST",
        requiresInput: {
          key: "question",
          label: "Question",
          placeholder: "What expertise does John Smith have?",
        },
      },
    ],
  },
  recommendations: {
    title: "Mentor Recommendations",
    description: "AI-powered mentor recommendations using multi-search pipeline",
    endpoints: [
      {
        name: "Continue Recommendations",
        description: "Mentors who should continue working with a team",
        endpoint: "/mentors/{team}/continue",
        method: "GET",
        requiresInput: {
          key: "team",
          label: "Team Name",
          placeholder: "e.g., DefenX",
        },
      },
      {
        name: "Available Mentors",
        description: "Cohort mentors not yet assigned to this team",
        endpoint: "/mentors/{team}/available",
        method: "GET",
        requiresInput: {
          key: "team",
          label: "Team Name",
          placeholder: "e.g., DefenX",
        },
      },
      {
        name: "Recruit Recommendations",
        description: "Contacts to recruit as new mentors for this team",
        endpoint: "/mentors/{team}/recruit",
        method: "GET",
        requiresInput: {
          key: "team",
          label: "Team Name",
          placeholder: "e.g., DefenX",
        },
      },
      {
        name: "Synthesize All Sources",
        description: "Combined recommendations from graph, vector, and RAG search",
        endpoint: "/mentors/{team}/synthesize",
        method: "GET",
        requiresInput: {
          key: "team",
          label: "Team Name",
          placeholder: "e.g., DefenX",
        },
      },
    ],
  },
  graph: {
    title: "Graph Inspection",
    description: "Inspect the knowledge graph structure",
    endpoints: [
      {
        name: "Graph Statistics",
        description: "Get node and edge counts by type",
        endpoint: "/graph/stats",
        method: "GET",
      },
      {
        name: "List Datasets",
        description: "List all datasets in the knowledge graph",
        endpoint: "/graph/datasets",
        method: "GET",
      },
    ],
  },
};

// Tab icons mapping
const TAB_ICONS: Record<string, React.ReactNode> = {
  health: <Activity className="h-4 w-4" />,
  airtableSync: <Database className="h-4 w-4" />,
  outlineSync: <FileText className="h-4 w-4" />,
  query: <Search className="h-4 w-4" />,
  sync: <Database className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  recommendations: <Users className="h-4 w-4" />,
  graph: <Sparkles className="h-4 w-4" />,
};

export default function ApiToolsPage() {
  const router = useRouter();
  const { userType, isLoading: userLoading } = useUserType();
  const [activeService, setActiveService] = useState<ServiceType>("cognee");
  const [activeTab, setActiveTab] = useState("health");
  const [loading, setLoading] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, ApiResponse>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [collections, setCollections] = useState<OutlineCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Get current endpoint groups based on service
  const endpointGroups = activeService === "graphiti" ? GRAPHITI_ENDPOINT_GROUPS : COGNEE_ENDPOINT_GROUPS;
  const apiProxyPath = activeService === "graphiti" ? "/api/admin/graphiti" : "/api/admin/cognee";

  // Redirect non-staff users
  useEffect(() => {
    if (!userLoading && userType !== "staff") {
      router.push("/dashboard");
    }
  }, [userType, userLoading, router]);

  // Reset tab when switching services
  useEffect(() => {
    setActiveTab("health");
    setResponses({});
  }, [activeService]);

  // Fetch collections when switching to outline tab (Graphiti only)
  const fetchCollections = useCallback(async () => {
    if (collections.length > 0 || collectionsLoading) return;

    setCollectionsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/graphiti?endpoint=${encodeURIComponent("/outline/test-collections")}`
      );
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    } finally {
      setCollectionsLoading(false);
    }
  }, [collections.length, collectionsLoading]);

  // Fetch collections when outline tab is active
  useEffect(() => {
    if (activeService === "graphiti" && activeTab === "outlineSync") {
      void fetchCollections();
    }
  }, [activeTab, activeService, fetchCollections]);

  const callEndpoint = async (endpoint: EndpointConfig) => {
    const key = `${activeService}:${endpoint.method}:${endpoint.endpoint}`;
    setLoading(key);

    try {
      let response;
      let body = endpoint.body;
      let resolvedEndpoint = endpoint.endpoint;

      // Handle input - either as path parameter or body parameter
      if (endpoint.requiresInput) {
        const inputValue = inputs[endpoint.endpoint];
        if (!inputValue) {
          toast.error(`${endpoint.requiresInput.label} is required`);
          setLoading(null);
          return;
        }

        // Check if endpoint has path parameter placeholder
        const pathParamPattern = `{${endpoint.requiresInput.key}}`;
        if (endpoint.endpoint.includes(pathParamPattern)) {
          resolvedEndpoint = endpoint.endpoint.replace(pathParamPattern, encodeURIComponent(inputValue));
        } else {
          body = { ...body, [endpoint.requiresInput.key]: inputValue };
        }
      }

      if (endpoint.method === "GET") {
        response = await fetch(
          `${apiProxyPath}?endpoint=${encodeURIComponent(resolvedEndpoint)}`
        );
      } else {
        response = await fetch(apiProxyPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: resolvedEndpoint,
            method: endpoint.method,
            body,
          }),
        });
      }

      const data = await response.json();

      setResponses((prev) => ({
        ...prev,
        [key]: {
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? data.error || "Request failed" : undefined,
          timestamp: new Date().toISOString(),
        },
      }));

      if (response.ok) {
        toast.success(`${endpoint.name} completed`);
      } else {
        toast.error(data.error || "Request failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setResponses((prev) => ({
        ...prev,
        [key]: {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      }));
      toast.error(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const getResponseForEndpoint = (endpoint: EndpointConfig): ApiResponse | undefined => {
    const key = `${activeService}:${endpoint.method}:${endpoint.endpoint}`;
    return responses[key];
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userType !== "staff") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Tools</h1>
        <p className="text-muted-foreground">
          Test and trigger knowledge graph service endpoints
        </p>
      </div>

      {/* Service Selector */}
      <div className="flex gap-2">
        <Button
          variant={activeService === "cognee" ? "default" : "outline"}
          onClick={() => setActiveService("cognee")}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          Cognee
        </Button>
        <Button
          variant={activeService === "graphiti" ? "default" : "outline"}
          onClick={() => setActiveService("graphiti")}
          className="gap-2"
        >
          <Server className="h-4 w-4" />
          Graphiti
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.entries(endpointGroups).map(([key, group]) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              {TAB_ICONS[key] || <Server className="h-4 w-4" />}
              {group.title.replace(" & Status", "").replace("Knowledge Graph ", "")}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(endpointGroups).map(([groupKey, group]) => (
          <TabsContent key={groupKey} value={groupKey} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TAB_ICONS[groupKey] || <Server className="h-5 w-5" />}
                  {group.title}
                  <Badge variant="outline" className="ml-2">
                    {activeService}
                  </Badge>
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.endpoints.map((endpoint, idx) => {
                  const key = `${activeService}:${endpoint.method}:${endpoint.endpoint}`;
                  const isLoading = loading === key;
                  const response = getResponseForEndpoint(endpoint);

                  return (
                    <div key={idx}>
                      {idx > 0 && <Separator className="my-4" />}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{endpoint.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {endpoint.method}
                              </Badge>
                              {endpoint.name.includes("Prune") && (
                                <Badge variant="destructive" className="text-xs">
                                  Destructive
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {endpoint.description}
                            </p>
                            <code className="text-xs text-muted-foreground mt-1 block">
                              {endpoint.endpoint}
                            </code>
                          </div>
                          <Button
                            onClick={() => callEndpoint(endpoint)}
                            disabled={isLoading}
                            size="sm"
                            variant={endpoint.name.includes("Prune") ? "destructive" : "default"}
                            className="gap-2"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Running...
                              </>
                            ) : endpoint.name.includes("Prune") ? (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Run
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Run
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Input field if required */}
                        {endpoint.requiresInput && (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label htmlFor={endpoint.endpoint} className="text-sm">
                                {endpoint.requiresInput.label}
                              </Label>
                              {endpoint.requiresInput.selectFromCollections ? (
                                <Select
                                  value={inputs[endpoint.endpoint] || ""}
                                  onValueChange={(value) =>
                                    setInputs((prev) => ({
                                      ...prev,
                                      [endpoint.endpoint]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue
                                      placeholder={
                                        collectionsLoading
                                          ? "Loading collections..."
                                          : collections.length === 0
                                          ? "No collections found"
                                          : endpoint.requiresInput.placeholder
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {collections.map((collection) => (
                                      <SelectItem key={collection.id} value={collection.id}>
                                        {collection.name}
                                        {collection.document_count !== undefined && (
                                          <span className="text-muted-foreground ml-2">
                                            ({collection.document_count} docs)
                                          </span>
                                        )}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  id={endpoint.endpoint}
                                  placeholder={endpoint.requiresInput.placeholder}
                                  value={inputs[endpoint.endpoint] || ""}
                                  onChange={(e) =>
                                    setInputs((prev) => ({
                                      ...prev,
                                      [endpoint.endpoint]: e.target.value,
                                    }))
                                  }
                                  className="mt-1"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Response display */}
                        {response && (
                          <div
                            className={cn(
                              "rounded-lg border p-3 mt-2 overflow-hidden",
                              response.success
                                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                                : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {response.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  response.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                )}
                              >
                                {response.success ? "Success" : "Error"}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(response.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <ScrollArea className="h-64 w-full rounded-md">
                              <pre className="text-xs font-mono whitespace-pre-wrap break-all p-1">
                                {response.success
                                  ? JSON.stringify(response.data, null, 2)
                                  : response.error}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common operations for {activeService}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {activeService === "cognee" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("health");
                    callEndpoint(COGNEE_ENDPOINT_GROUPS.health.endpoints[1]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <Activity className={cn("h-4 w-4", loading && "animate-spin")} />
                  Health Check
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("sync");
                    callEndpoint(COGNEE_ENDPOINT_GROUPS.sync.endpoints[4]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <Database className="h-4 w-4" />
                  List Sync Jobs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("graph");
                    callEndpoint(COGNEE_ENDPOINT_GROUPS.graph.endpoints[0]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Graph Stats
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("health");
                    callEndpoint(GRAPHITI_ENDPOINT_GROUPS.health.endpoints[0]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Liveness Check
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("airtableSync");
                    callEndpoint(GRAPHITI_ENDPOINT_GROUPS.airtableSync.endpoints[1]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <Database className="h-4 w-4" />
                  Check Sync Status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("outlineSync");
                    callEndpoint(GRAPHITI_ENDPOINT_GROUPS.outlineSync.endpoints[0]);
                  }}
                  disabled={loading !== null}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  List Outline Collections
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
