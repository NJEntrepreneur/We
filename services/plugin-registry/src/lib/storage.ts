import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { RegistryConfig } from '../config.js';

export interface StorageClient {
  upload(key: string, content: Buffer, contentType: string): Promise<string>;
  getUrl(key: string): string;
}

export function createStorageClient(config: RegistryConfig): StorageClient {
  const s3 = new S3Client({
    endpoint: config.s3Endpoint,
    region: config.s3Region,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
    forcePathStyle: true,
  });

  return {
    async upload(key: string, content: Buffer, contentType: string): Promise<string> {
      await s3.send(
        new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: key,
          Body: content,
          ContentType: contentType,
        }),
      );
      return `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
    },

    getUrl(key: string): string {
      return `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
    },
  };
}
