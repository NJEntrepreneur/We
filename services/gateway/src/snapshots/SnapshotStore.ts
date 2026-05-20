import { S3Client, PutObjectCommand, GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import type { GatewayConfig } from '../config.js';

export interface SnapshotStore {
  put(userId: string, id: string, data: string): Promise<void>;
  get(userId: string, id: string): Promise<string | null>;
}

export class S3SnapshotStore implements SnapshotStore {
  private readonly _s3: S3Client;
  private readonly _bucket: string;

  constructor(config: GatewayConfig) {
    this._s3 = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
      },
      forcePathStyle: true,
    });
    this._bucket = config.s3Bucket;
  }

  async put(userId: string, id: string, data: string): Promise<void> {
    await this._s3.send(new PutObjectCommand({
      Bucket: this._bucket,
      Key: `snapshots/${userId}/${id}.json`,
      Body: data,
      ContentType: 'application/json',
    }));
  }

  async get(userId: string, id: string): Promise<string | null> {
    try {
      const output = await this._s3.send(new GetObjectCommand({
        Bucket: this._bucket,
        Key: `snapshots/${userId}/${id}.json`,
      }));
      if (!output.Body) return null;
      return await output.Body.transformToString();
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly _data = new Map<string, string>();

  async put(userId: string, id: string, data: string): Promise<void> {
    this._data.set(`${userId}/${id}`, data);
  }

  async get(userId: string, id: string): Promise<string | null> {
    return this._data.get(`${userId}/${id}`) ?? null;
  }
}
