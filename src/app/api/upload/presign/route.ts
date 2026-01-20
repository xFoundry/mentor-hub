import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuthSession } from "@/lib/api-auth";

// 7 days in seconds (max allowed by AWS SDK v4 signature)
const PRESIGNED_URL_EXPIRY = 7 * 24 * 60 * 60;

/**
 * Generate a presigned URL for a file in Railway S3
 * POST /api/upload/presign
 * Body: { key: "feedback-attachments/filename.jpg" }
 *
 * Railway uses virtual-hosted style URLs: https://{bucket}.storage.railway.app/{key}
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthSession();
    if (auth instanceof NextResponse) return auth;

    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Use base endpoint with virtual-hosted style addressing
    // AWS SDK will generate: https://{bucket}.storage.railway.app/{key}
    const s3Client = new S3Client({
      endpoint: "https://storage.railway.app",
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: false, // Use virtual-hosted style
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    return NextResponse.json({ presignedUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
