/**
 * Email System Health Check API
 *
 * Provides diagnostic information for the email scheduling system.
 * Use this to verify configuration, check connectivity, and audit state.
 */

import { NextRequest, NextResponse } from "next/server";
import { qstash, getBaseUrl, FLOW_CONTROL, RETRY_CONFIG } from "@/lib/qstash";
import { redis, isRedisAvailable, REDIS_KEYS } from "@/lib/redis";
import { isQStashSchedulerEnabled } from "@/lib/notifications/qstash-scheduler";
import { updateBatchProgress } from "@/lib/notifications/job-store";
import { requireStaffSession } from "@/lib/api-auth";

export const runtime = "nodejs";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    qstash: {
      enabled: boolean;
      tokenConfigured: boolean;
      signingKeysConfigured: boolean;
      baseUrl: string;
      testPublish?: {
        success: boolean;
        messageId?: string;
        error?: string;
      };
    };
    redis: {
      connected: boolean;
      error?: string;
    };
    resend: {
      apiKeyConfigured: boolean;
      fromEmail: string;
      testMode: boolean;
      testRecipient?: string;
    };
    env: {
      appBaseUrl: string;
      vercelUrl?: string;
      nodeEnv: string;
    };
  };
  config: {
    flowControl: typeof FLOW_CONTROL;
    retryConfig: typeof RETRY_CONFIG;
    endpoints: {
      worker: string;
      callback: string;
      failure: string;
    };
  };
  stats?: {
    activeBatchCount: number;
    dlqCount: number;
  };
}

/**
 * GET /api/admin/emails/health
 *
 * Run health checks on the email system
 * Query params:
 * - testPublish=true: Actually publish a test message to QStash (will be cancelled)
 * - recalculate=true: Recalculate all batch statuses (useful after code changes)
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaffSession();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const testPublish = searchParams.get("testPublish") === "true";
  const recalculate = searchParams.get("recalculate") === "true";

  const baseUrl = getBaseUrl();
  const result: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      qstash: {
        enabled: isQStashSchedulerEnabled(),
        tokenConfigured: !!process.env.MENTOR_QSTASH_TOKEN,
        signingKeysConfigured: !!(
          process.env.MENTOR_QSTASH_CURRENT_SIGNING_KEY &&
          process.env.MENTOR_QSTASH_NEXT_SIGNING_KEY
        ),
        baseUrl,
      },
      redis: {
        connected: false,
      },
      resend: {
        apiKeyConfigured: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || "not configured",
        testMode: process.env.EMAIL_TEST_MODE === "true",
        testRecipient: process.env.EMAIL_TEST_RECIPIENT,
      },
      env: {
        appBaseUrl: process.env.APP_BASE_URL || "not set",
        vercelUrl: process.env.VERCEL_URL,
        nodeEnv: process.env.NODE_ENV || "unknown",
      },
    },
    config: {
      flowControl: FLOW_CONTROL,
      retryConfig: RETRY_CONFIG,
      endpoints: {
        worker: `${baseUrl}/api/qstash/worker`,
        callback: `${baseUrl}/api/qstash/callback`,
        failure: `${baseUrl}/api/qstash/failure`,
      },
    },
  };

  // Check Redis connectivity
  try {
    result.checks.redis.connected = await isRedisAvailable();
    if (!result.checks.redis.connected) {
      result.status = "degraded";
    }
  } catch (error) {
    result.checks.redis.connected = false;
    result.checks.redis.error = error instanceof Error ? error.message : "Unknown error";
    result.status = "degraded";
  }

  // Get stats if Redis is available
  if (result.checks.redis.connected) {
    try {
      const dlqEntries = await redis.lrange(REDIS_KEYS.deadLetter(), 0, -1);
      const batchKeys = await redis.keys("email:batch:*");
      const activeBatches = batchKeys.filter(k => !k.includes(":jobs"));

      result.stats = {
        activeBatchCount: activeBatches.length,
        dlqCount: dlqEntries.length,
      };

      // Recalculate batch statuses if requested
      if (recalculate) {
        console.log(`[Health Check] Recalculating ${activeBatches.length} batch statuses...`);
        for (const batchKey of activeBatches) {
          const batchId = batchKey.replace("email:batch:", "");
          await updateBatchProgress(batchId);
        }
        console.log(`[Health Check] Batch status recalculation complete`);
      }
    } catch {
      // Stats are optional, don't fail health check
    }
  }

  // Test QStash publish if requested
  if (testPublish && result.checks.qstash.tokenConfigured) {
    try {
      const testMessage = await qstash.publishJSON({
        url: `${baseUrl}/api/qstash/worker`,
        body: { test: true, timestamp: Date.now() },
        delay: 300, // 5 minutes delay
        headers: {
          "Content-Type": "application/json",
        },
      });

      result.checks.qstash.testPublish = {
        success: true,
        messageId: testMessage.messageId,
      };

      // Cancel the test message immediately
      try {
        await qstash.messages.delete(testMessage.messageId);
        console.log(`[Health Check] Test message ${testMessage.messageId} published and cancelled`);
      } catch (cancelError) {
        console.warn(`[Health Check] Failed to cancel test message: ${cancelError}`);
      }
    } catch (error) {
      result.checks.qstash.testPublish = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      result.status = "degraded";
    }
  }

  // Determine overall status
  if (!result.checks.qstash.tokenConfigured || !result.checks.redis.connected) {
    result.status = "unhealthy";
  } else if (!result.checks.qstash.enabled || !result.checks.resend.apiKeyConfigured) {
    result.status = "degraded";
  }

  // Log health check result
  console.log(`[Health Check] Status: ${result.status}`, {
    qstashEnabled: result.checks.qstash.enabled,
    redisConnected: result.checks.redis.connected,
    resendConfigured: result.checks.resend.apiKeyConfigured,
    baseUrl: result.checks.env.appBaseUrl,
  });

  return NextResponse.json(result);
}
