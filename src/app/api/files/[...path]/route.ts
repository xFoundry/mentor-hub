import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client for Railway
const s3Client = new S3Client({
  endpoint: `https://${process.env.BUCKET_NAME}.storage.railway.app`,
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Required for the endpoint format
});

/**
 * Proxy endpoint for serving files from Railway S3 bucket
 * This allows Airtable to access files since Railway buckets are private
 *
 * URL format: /api/files/feedback-attachments/filename.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join("/");

  if (!filePath) {
    return NextResponse.json({ error: "File path required" }, { status: 400 });
  }

  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  try {
    // Fetch from Railway S3 using AWS SDK
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Return the file with appropriate headers
    const headers = new Headers({
      "Content-Type": response.ContentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    if (response.ContentLength) {
      headers.set("Content-Length", response.ContentLength.toString());
    }

    return new NextResponse(buffer, { headers });
  } catch (error: any) {
    console.error("Error proxying file:", error);

    if (error.name === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
