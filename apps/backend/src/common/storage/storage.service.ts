/**
 * StorageService — reusable S3-compatible MinIO client (Phase 5+6).
 * Generic: NOT plantilla-specific. Phase 6 documentos will also use putObject + getPresignedUrl.
 *
 * MinIO env vars (docker-compose defaults):
 *   MINIO_ENDPOINT=minio, MINIO_PORT=9000,
 *   MINIO_ACCESS_KEY=minioadmin, MINIO_SECRET_KEY=minioadmin, MINIO_BUCKET=lexscribe
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('MINIO_ENDPOINT') ?? 'minio';
    const port = config.get<string>('MINIO_PORT') ?? '9000';
    const accessKeyId = config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin';
    const secretAccessKey = config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin';
    this.bucket = config.get<string>('MINIO_BUCKET') ?? 'lexscribe';

    this.s3 = new S3Client({
      endpoint: `http://${endpoint}:${port}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async onModuleInit(): Promise<void> {
    // Skip actual S3 calls in test env — no live MinIO available
    if (process.env.NODE_ENV === 'test') return;

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    } catch (err: unknown) {
      // AWS SDK v3 exposes HTTP status via $metadata.httpStatusCode, not statusCode
      const statusCode =
        err != null &&
        typeof err === 'object' &&
        '$metadata' in err &&
        typeof (err as { $metadata?: { httpStatusCode?: unknown } }).$metadata
          ?.httpStatusCode === 'number'
          ? (err as { $metadata: { httpStatusCode: number } }).$metadata.httpStatusCode
          : null;
      // 404 = bucket not found → create; other errors we log and continue
      if (statusCode === 404 || statusCode === 403) {
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`Bucket "${this.bucket}" created`);
        } catch (createErr: unknown) {
          this.logger.error(`Failed to create bucket "${this.bucket}"`, createErr);
        }
      } else {
        this.logger.warn(`HeadBucket error (non-fatal, continuing): ${String(err)}`);
      }
    }
  }

  /**
   * Upload an object to MinIO.
   * @param key         Storage key (path within bucket, e.g. "plantillas/{id}/{name}.docx")
   * @param body        File buffer
   * @param contentType MIME type (e.g. "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
   * @returns           The key (storagePath to store in DB)
   */
  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  /**
   * Generate a presigned URL for temporary object access (Phase 6 documentos).
   * @param key        Storage key
   * @param ttlSeconds URL expiry in seconds (default 300s = 5 min)
   * @returns          Presigned URL string
   */
  async getPresignedUrl(key: string, ttlSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
  }
}
