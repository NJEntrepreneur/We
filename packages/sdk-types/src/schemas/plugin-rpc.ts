import { z } from 'zod';

export const PluginRPCRequestSchema = z.object({
  id:              z.string().uuid('RPC request ID must be a UUID'),
  method:          z.string().min(1, 'Method name cannot be empty'),
  params:          z.unknown(),
  capabilityToken: z.string().min(1, 'Capability token cannot be empty'),
});
export type PluginRPCRequest = z.infer<typeof PluginRPCRequestSchema>;

export const PluginRPCErrorSchema = z.object({
  code:    z.string().min(1, 'Error code cannot be empty'),
  message: z.string().min(1, 'Error message cannot be empty'),
});
export type PluginRPCError = z.infer<typeof PluginRPCErrorSchema>;

export const PluginRPCResponseSchema = z.object({
  id:     z.string().uuid('RPC response ID must be a UUID'),
  result: z.unknown().optional(),
  error:  PluginRPCErrorSchema.optional(),
});
export type PluginRPCResponse = z.infer<typeof PluginRPCResponseSchema>;
