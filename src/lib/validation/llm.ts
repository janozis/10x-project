import { z } from "zod";

/**
 * Zod schema for LLM chat message
 * Business rules:
 * - role must be one of: system, user, assistant, tool
 * - content must be a non-empty string
 * - content length limited to prevent excessively large payloads
 */
export const llmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool'], {
    errorMap: () => ({ message: 'role must be system, user, assistant, or tool' }),
  }),
  content: z.string().min(1, 'content cannot be empty').max(50000, 'content too long (max 50000 chars)'),
});

/**
 * Zod schema for JSON Schema object used in response_format
 * Simplified validation - actual schema validation happens at API level
 */
export const jsonSchemaSchema = z.object({
  name: z.string().min(1, 'schema name required'),
  strict: z.literal(true),
  schema: z.record(z.unknown()),
});

/**
 * Zod schema for response_format option
 */
export const responseFormatSchema = z.object({
  type: z.literal('json_schema'),
  json_schema: jsonSchemaSchema,
});

/**
 * Zod schema for completion request parameters
 * Business rules:
 * - temperature: 0.0 - 2.0 (most models work best in 0.0 - 1.0 range)
 * - max_tokens: 1 - 32000 (varies by model, enforced at API level)
 * - top_p: 0.0 - 1.0
 * - frequency_penalty: -2.0 - 2.0
 * - presence_penalty: -2.0 - 2.0
 */
export const completionParamsSchema = z.object({
  temperature: z.number().min(0.0).max(2.0).optional(),
  max_tokens: z.number().int().min(1).max(32000).optional(),
  top_p: z.number().min(0.0).max(1.0).optional(),
  frequency_penalty: z.number().min(-2.0).max(2.0).optional(),
  presence_penalty: z.number().min(-2.0).max(2.0).optional(),
});

/**
 * Zod schema for completion request options
 */
export const completionOptionsSchema = z.object({
  model: z.string().min(1).optional(),
  params: completionParamsSchema.optional(),
  response_format: responseFormatSchema.optional(),
});

/**
 * Zod schema for POST /api/ai/chat request body
 * Business rules:
 * - messages array must contain at least 1 message
 * - messages array limited to 100 messages to prevent abuse
 * - options are optional
 */
export const chatRequestSchema = z.object({
  messages: z
    .array(llmMessageSchema)
    .min(1, 'messages array must contain at least 1 message')
    .max(100, 'messages array too large (max 100 messages)'),
  options: completionOptionsSchema.optional(),
});

export type LlmMessageInput = z.infer<typeof llmMessageSchema>;
export type CompletionParamsInput = z.infer<typeof completionParamsSchema>;
export type CompletionOptionsInput = z.infer<typeof completionOptionsSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

