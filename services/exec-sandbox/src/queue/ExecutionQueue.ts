import { Queue, Worker, QueueEvents } from 'bullmq';
import type { ExecutionJobData, ExecutionJobResult } from '../types.js';
import type { DockerRunner } from '../runner/DockerRunner.js';

export type { ExecutionJobData, ExecutionJobResult };

const QUEUE_NAME = 'executions';
const JOB_NAME  = 'execute';

export interface ExecutionQueue {
  enqueue(data: ExecutionJobData): Promise<ExecutionJobResult>;
  getDepth(): Promise<number>;
  close(): Promise<void>;
}

interface RedisConnection {
  host: string;
  port: number;
  password?: string | undefined;
  db: number;
  maxRetriesPerRequest: null;
}

function parseRedisUrl(url: string): RedisConnection {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    db: parsed.pathname && parsed.pathname.length > 1
      ? Number(parsed.pathname.slice(1)) || 0
      : 0,
    maxRetriesPerRequest: null,
  };
}

export class BullMQExecutionQueue implements ExecutionQueue {
  private readonly _queue: Queue<ExecutionJobData, ExecutionJobResult>;
  private readonly _worker: Worker<ExecutionJobData, ExecutionJobResult>;
  private readonly _events: QueueEvents;

  constructor(redisUrl: string, runner: DockerRunner, concurrency = 4) {
    const connection = parseRedisUrl(redisUrl);

    this._queue = new Queue<ExecutionJobData, ExecutionJobResult>(QUEUE_NAME, {
      connection,
    });

    this._events = new QueueEvents(QUEUE_NAME, { connection });

    this._worker = new Worker<ExecutionJobData, ExecutionJobResult>(
      QUEUE_NAME,
      (job) => runner.run(job.data),
      { connection, concurrency },
    );
  }

  async enqueue(data: ExecutionJobData): Promise<ExecutionJobResult> {
    const job = await this._queue.add(JOB_NAME, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    return job.waitUntilFinished(this._events) as Promise<ExecutionJobResult>;
  }

  async getDepth(): Promise<number> {
    return this._queue.getWaitingCount();
  }

  async close(): Promise<void> {
    await Promise.all([
      this._worker.close(),
      this._queue.close(),
      this._events.close(),
    ]);
  }
}
