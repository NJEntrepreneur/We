// Shared job types used by DockerRunner and ExecutionQueue.

export interface ExecutionJobData {
  executionId: string;
  language: string;
  code: string;
  stdin?: string | undefined;
  timeoutMs: number;
  env?: Record<string, string> | undefined;
}

export interface ExecutionJobResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}
