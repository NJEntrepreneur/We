import { z } from 'zod';

export const PluginRPCErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});
export type PluginRPCError = z.infer<typeof PluginRPCErrorSchema>;

// §5: all RPC calls use this request envelope
export const PluginRPCRequestSchema = z.object({
  id: z.string().uuid(),
  method: z.string().min(1).max(128),
  params: z.unknown(),
  capabilityToken: z.string().min(1),
});
export type PluginRPCRequest = z.infer<typeof PluginRPCRequestSchema>;

// §5: response envelope — exactly one of result/error is present
export const PluginRPCResponseSchema = z
  .object({
    id: z.string().uuid(),
    result: z.unknown().optional(),
    error: PluginRPCErrorSchema.optional(),
  })
  .refine(
    (v) => v.result !== undefined || v.error !== undefined,
    'Response must contain either result or error',
  );
export type PluginRPCResponse = z.infer<typeof PluginRPCResponseSchema>;

// Discriminated union for the postMessage bridge
export const PluginRPCMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('request'), payload: PluginRPCRequestSchema }),
  z.object({ type: z.literal('response'), payload: PluginRPCResponseSchema }),
]);
export type PluginRPCMessage = z.infer<typeof PluginRPCMessageSchema>;
