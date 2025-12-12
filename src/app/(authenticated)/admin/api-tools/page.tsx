"use client";

import { useEffect, useState } from "react";
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
    selectFromCollections?: boolean; // If true, show collection dropdown
  };
}

// Endpoint configurations grouped by category
const ENDPOINT_GROUPS: Record<string, { title: string; description: string; endpoints: EndpointConfig[] }> = {
  health: {
    title: "Health & Status",
    description: "Check service health and status",
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
    description: "Search and query the knowledge graph",
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
        name: "Get Entity",
        description: "Get details for a specific entity by name",
        endpoint: "/query/entity",
        method: "POST",
        requiresInput: {
          key: "name",
          label: "Entity Name",
          placeholder: "Enter entity name...",
        },
      },
    ],
  },
};

export default function ApiToolsPage() {
  const router = useRouter();
  const { userType, isLoading: userLoading } = useUserType();
  const [activeTab, setActiveTab] = useState("health");
  const [loading, setLoading] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, ApiResponse>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [collections, setCollections] = useState<OutlineCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Redirect non-staff users
  useEffect(() => {
    if (!userLoading && userType !== "staff") {
      router.push("/dashboard");
    }
  }, [userType, userLoading, router]);

  // Fetch collections when switching to outline tab
  const fetchCollections = async () => {
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
  };

  // Fetch collections when outline tab is active
  useEffect(() => {
    if (activeTab === "outlineSync") {
      fetchCollections();
    }
  }, [activeTab]);

  const callEndpoint = async (endpoint: EndpointConfig) => {
    const key = `${endpoint.method}:${endpoint.endpoint}`;
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
          resolvedEndpoint = endpoint.endpoint.replace(pathParamPattern, inputValue);
        } else {
          body = { ...body, [endpoint.requiresInput.key]: inputValue };
        }
      }

      if (endpoint.method === "GET") {
        response = await fetch(
          `/api/admin/graphiti?endpoint=${encodeURIComponent(resolvedEndpoint)}`
        );
      } else {
        response = await fetch("/api/admin/graphiti", {
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
    const key = `${endpoint.method}:${endpoint.endpoint}`;
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
          Trigger and test Graphiti service endpoints
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="airtableSync" className="gap-2">
            <Database className="h-4 w-4" />
            Airtable Sync
          </TabsTrigger>
          <TabsTrigger value="outlineSync" className="gap-2">
            <FileText className="h-4 w-4" />
            Outline Sync
          </TabsTrigger>
          <TabsTrigger value="query" className="gap-2">
            <Search className="h-4 w-4" />
            Query
          </TabsTrigger>
        </TabsList>

        {Object.entries(ENDPOINT_GROUPS).map(([groupKey, group]) => (
          <TabsContent key={groupKey} value={groupKey} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {group.title}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.endpoints.map((endpoint, idx) => {
                  const key = `${endpoint.method}:${endpoint.endpoint}`;
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
                            className="gap-2"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Running...
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
          <CardDescription>Common operations you might want to run</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab("health");
                callEndpoint(ENDPOINT_GROUPS.health.endpoints[0]);
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
                callEndpoint(ENDPOINT_GROUPS.airtableSync.endpoints[1]);
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
                callEndpoint(ENDPOINT_GROUPS.outlineSync.endpoints[2]);
              }}
              disabled={loading !== null}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              List Outline Collections
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
