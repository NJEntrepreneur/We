import { z } from 'zod';

export const ExecutionLanguageSchema = z.enum([
  'javascript',
  'typescript',
  'python',
  'bash',
]);
export type ExecutionLanguage = z.infer<typeof ExecutionLanguageSchema>;

export const ExecutionRequestSchema = z.object({
  language:  ExecutionLanguageSchema,
  code:      z.string().min(1, 'Code cannot be empty'),
  stdin:     z.string().optional(),
  timeoutMs: z.number().int().min(1).max(10_000).optional(),
  env:       z.record(z.string(), z.string()).optional(),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

export const ExecutionResultSchema = z.object({
  stdout:     z.string(),
  stderr:     z.string(),
  exitCode:   z.number().int(),
  durationMs: z.number().nonnegative(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
