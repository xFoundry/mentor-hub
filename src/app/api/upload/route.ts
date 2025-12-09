import { route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { custom } from "@better-upload/server/clients";

// Railway S3-compatible storage client
// Uses virtual-hosted style URLs: https://{bucket}.storage.railway.app
const railwayS3 = custom({
  host: "storage.railway.app",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || "us-east-1",
  secure: true,
  forcePathStyle: false, // Railway uses virtual-hosted style
});

const bucketName = process.env.BUCKET_NAME!;

const router: Router = {
  client: railwayS3,
  bucketName,
  routes: {
    // Feedback attachments - documents, images, PDFs
    feedbackAttachments: route({
      fileTypes: [
        "image/*",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
      ],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
      onBeforeUpload: async () => {
        return {
          generateObjectInfo: ({ file }) => ({
            // Store in feedback-attachments folder with timestamp prefix
            key: `feedback-attachments/${Date.now()}-${file.name}`,
          }),
        };
      },
      // Note: Presigned URLs are generated client-side via /api/upload/presign
    }),
  },
};

export const { POST } = toRouteHandler(router);
