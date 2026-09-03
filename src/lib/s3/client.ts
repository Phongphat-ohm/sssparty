import { S3Client } from "@aws-sdk/client-s3";

export const S3_BUCKET = process.env.S3_BUCKET || "sssparty";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://s3.ppkxb.space";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "mock-access-key";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "mock-secret-key";
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== "false";

export const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

/**
 * ดึง URL ของไฟล์ที่อัปโหลดไว้ใน S3 ผ่าน Secure Stream Proxy (/api/files)
 * หมดปัญหา 403 AccessDenied จาก Private S3 Bucket 100%
 */
export function getS3PublicUrl(fileKey: string): string {
  const cleanKey = fileKey.replace(/^\//, "");
  return `/api/files/${cleanKey}`;
}
