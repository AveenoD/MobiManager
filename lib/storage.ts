/**
 * S3-compatible object storage (MinIO / R2 / AWS) — presigned PUT/GET.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from './env';

export type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function getStorageConfigFromEnv(): StorageConfig | null {
  const e = getEnv();
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET } = e;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_BUCKET) {
    return null;
  }
  return {
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    bucket: S3_BUCKET,
  };
}

export function createS3Client(cfg: StorageConfig): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function presignPut(
  client: S3Client,
  cfg: StorageConfig,
  objectKey: string,
  contentType: string,
  expiresSec = 900
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn: expiresSec });
}

export async function presignGet(
  client: S3Client,
  cfg: StorageConfig,
  objectKey: string,
  expiresSec = 900
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: objectKey,
  });
  return getSignedUrl(client, cmd, { expiresIn: expiresSec });
}
