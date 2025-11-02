import * as React from "react";
import type { LlmMessage, LlmCompletionResult, LlmErrorCode } from "../../types";

/**
 * Options for useLlmChat hook
 */
export interface UseLlmChatOptions {
  /** Model to use (e.g. 'anthropic/claude-3.5-sonnet') */
  model?: string;
  /** Model parameters */
  params?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  /** Structured output configuration (JSON Schema) */
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  /** Callback invoked when request completes successfully */
  onSuccess?: (result: LlmCompletionResult) => void;
  /** Callback invoked when request fails */
  onError?: (error: LlmChatError) => void;
}

/**
 * Error object returned by LLM API
 */
export interface LlmChatError {
  code: LlmErrorCode;
  message: string;
  statusCode?: number;
}

/**
 * State returned by useLlmChat hook
 */
export interface UseLlmChatState {
  /** Current completion result (null if not yet loaded or on error) */
  data: LlmCompletionResult | null;
  /** Whether a request is currently in flight */
  loading: boolean;
  /** Error object if request failed */
  error: LlmChatError | null;
  /** Function to execute a chat completion request */
  send: (messages: LlmMessage[]) => Promise<void>;
  /** Function to reset state (clear data, error) */
  reset: () => void;
}

/**
 * Custom React hook for LLM chat completions (non-streaming)
 * 
 * @example
 * ```tsx
 * const { data, loading, error, send } = useLlmChat({
 *   model: 'anthropic/claude-3.5-sonnet',
 *   params: { temperature: 0.7 }
 * });
 * 
 * const handleSubmit = async () => {
 *   await send([
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Hello!' }
 *   ]);
 * };
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (data) return <div>{data.content}</div>;
 * ```
 */
export function useLlmChat(options?: UseLlmChatOptions): UseLlmChatState {
  const [data, setData] = React.useState<LlmCompletionResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<LlmChatError | null>(null);

  // Use ref to avoid recreating send function on every render
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const send = React.useCallback(async (messages: LlmMessage[]) => {
    // Guard: Validate messages
    if (!messages || messages.length === 0) {
      const error: LlmChatError = {
        code: 'LLM_VALIDATION_ERROR',
        message: 'Messages array cannot be empty',
        statusCode: 400,
      };
      setError(error);
      optionsRef.current?.onError?.(error);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          options: {
            model: optionsRef.current?.model,
            params: optionsRef.current?.params,
            response_format: optionsRef.current?.response_format,
          },
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        // API returned an error
        const error: LlmChatError = {
          code: json.error?.code || 'LLM_UPSTREAM_ERROR',
          message: json.error?.message || 'An error occurred',
          statusCode: response.status,
        };
        setError(error);
        optionsRef.current?.onError?.(error);
        return;
      }

      // Success
      const result = json.data as LlmCompletionResult;
      setData(result);
      optionsRef.current?.onSuccess?.(result);
    } catch (err) {
      // Network or parsing error
      const error: LlmChatError = {
        code: 'LLM_UPSTREAM_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
        statusCode: 0,
      };
      setError(error);
      optionsRef.current?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, send, reset };
}

/**
 * Custom React hook for LLM chat streaming
 * 
 * @example
 * ```tsx
 * const { content, loading, error, stream } = useLlmChatStream({
 *   model: 'anthropic/claude-3.5-sonnet'
 * });
 * 
 * const handleSubmit = async () => {
 *   await stream([
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Tell me a story.' }
 *   ]);
 * };
 * 
 * if (loading) return <div>Streaming...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * return <div>{content}</div>;
 * ```
 */
export interface UseLlmChatStreamOptions {
  /** Model to use */
  model?: string;
  /** Model parameters */
  params?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  /** Callback invoked when streaming completes */
  onComplete?: (fullContent: string) => void;
  /** Callback invoked when streaming fails */
  onError?: (error: LlmChatError) => void;
}

export interface UseLlmChatStreamState {
  /** Accumulated content from stream */
  content: string;
  /** Whether streaming is in progress */
  loading: boolean;
  /** Error object if streaming failed */
  error: LlmChatError | null;
  /** Function to start streaming */
  stream: (messages: LlmMessage[]) => Promise<void>;
  /** Function to reset state */
  reset: () => void;
}

export function useLlmChatStream(options?: UseLlmChatStreamOptions): UseLlmChatStreamState {
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<LlmChatError | null>(null);

  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const stream = React.useCallback(async (messages: LlmMessage[]) => {
    // Guard: Validate messages
    if (!messages || messages.length === 0) {
      const error: LlmChatError = {
        code: 'LLM_VALIDATION_ERROR',
        message: 'Messages array cannot be empty',
        statusCode: 400,
      };
      setError(error);
      optionsRef.current?.onError?.(error);
      return;
    }

    setLoading(true);
    setError(null);
    setContent('');

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          options: {
            model: optionsRef.current?.model,
            params: optionsRef.current?.params,
          },
        }),
      });

      if (!response.ok) {
        // Try to parse error JSON
        const json = await response.json().catch(() => null);
        const error: LlmChatError = {
          code: json?.error?.code || 'LLM_UPSTREAM_ERROR',
          message: json?.error?.message || 'Streaming request failed',
          statusCode: response.status,
        };
        setError(error);
        optionsRef.current?.onError?.(error);
        setLoading(false);
        return;
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Stream finished
              optionsRef.current?.onComplete?.(accumulated);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setContent(accumulated);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      const error: LlmChatError = {
        code: 'LLM_UPSTREAM_ERROR',
        message: err instanceof Error ? err.message : 'Streaming error',
        statusCode: 0,
      };
      setError(error);
      optionsRef.current?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setContent('');
    setError(null);
  }, []);

  return { content, loading, error, stream, reset };
}

