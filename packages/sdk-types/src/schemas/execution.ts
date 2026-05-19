import { z } from 'zod';

// §8: POST /execute request body
export const ExecutionRequestSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'bash']),
  code: z.string().min(1).max(100_000),
  stdin: z.string().max(65_536).optional(),
  // §8: hard ceiling at 10 seconds wall clock
  timeoutMs: z.number().int().min(1).max(10_000).optional(),
  // Keys are allowlisted by exec-sandbox — schema only enforces shape
  env: z.record(z.string().min(1), z.string()).optional(),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

// §8: response from the sandbox runner
export const ExecutionResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
