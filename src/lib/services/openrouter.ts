/**
 * OpenRouterService - Server-side integration with OpenRouter Chat Completions API
 *
 * Features:
 * - Secure API key handling (server-only)
 * - Synchronous completions (JSON responses)
 * - Streaming completions (SSE / fetch streaming)
 * - Structured responses via JSON Schema (response_format)
 * - Comprehensive error handling and HTTP error mapping
 */

import type { LlmMessage, LlmCompletionResult, LlmApiError, LlmErrorCode } from "../../types";

/** Configuration options for OpenRouterService */
export interface OpenRouterServiceOptions {
  /** API key (defaults to import.meta.env.OPENROUTER_API_KEY) */
  apiKey?: string;
  /** Base URL for OpenRouter API (defaults to official endpoint) */
  baseUrl?: string;
  /** Default model to use (e.g. 'anthropic/claude-3.5-sonnet' or 'openrouter/auto') */
  defaultModel?: string;
  /** Default parameters for completions */
  defaultParams?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  /** Custom headers for OpenRouter */
  headers?: {
    /** HTTP-Referer header (your domain) */
    referer?: string;
    /** X-Title header (your app name) */
    title?: string;
  };
  /** Custom fetch implementation (for testing/injection) */
  fetchImpl?: typeof fetch;
}

/** Options for completion requests */
export interface CompletionOptions {
  /** Model to use (overrides default) */
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
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
}

/** OpenRouter API response for non-streaming requests */
interface OpenRouterCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouterService - Main service class for OpenRouter API integration
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private defaultParams?: CompletionOptions["params"];
  private readonly customHeaders?: { referer?: string; title?: string };

  /** Base URL for OpenRouter API (read-only) */
  public readonly baseUrl: string;

  /** Default model (read-only) */
  public readonly defaultModel: string;

  /**
   * Creates a new OpenRouterService instance
   * @throws {Error} If API key is missing
   */
  constructor(options?: OpenRouterServiceOptions) {
    // Guard: API key is required
    // Support both import.meta.env (Astro) and process.env (Node.js)
    const apiKey =
      options?.apiKey ??
      (typeof process !== "undefined" && process.env ? process.env.OPENROUTER_API_KEY : undefined) ??
      (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.OPENROUTER_API_KEY : undefined);

    if (!apiKey) {
      throw new Error(
        "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass apiKey in options."
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = options?.defaultModel ?? "openrouter/auto";
    this.defaultParams = options?.defaultParams;
    this.customHeaders = options?.headers;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  /**
   * Sets the default model for subsequent requests
   */
  public setDefaultModel(model: string): void {
    if (!model) {
      throw new Error("Model name cannot be empty");
    }
    (this as { defaultModel: string }).defaultModel = model;
  }

  /**
   * Sets the default parameters for subsequent requests
   */
  public setDefaultParams(params: NonNullable<CompletionOptions["params"]>): void {
    this.defaultParams = params;
  }

  /**
   * Executes a synchronous chat completion request
   *
   * @param messages - Array of conversation messages
   * @param options - Optional completion parameters
   * @returns Completion result with content and metadata
   * @throws {Error} Mapped domain errors (auth, rate limit, upstream, etc.)
   */
  public async completeChat(messages: LlmMessage[], options?: CompletionOptions): Promise<LlmCompletionResult> {
    // Guard: Validate messages
    if (!messages || messages.length === 0) {
      throw this.createDomainError("LLM_VALIDATION_ERROR", "Messages array cannot be empty", 400);
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        throw this.createDomainError("LLM_VALIDATION_ERROR", "Each message must have role and content", 400);
      }
    }

    const body = this.buildBody(messages, options);

    try {
      const response = await this.postJson<OpenRouterCompletionResponse>(body, options?.signal);
      return this.mapCompletionResponse(response);
    } catch (error) {
      throw this.mapHttpErrorToDomain(error);
    }
  }

  /**
   * Executes a streaming chat completion request
   *
   * @param messages - Array of conversation messages
   * @param options - Optional completion parameters
   * @returns ReadableStream of response chunks
   * @throws {Error} Mapped domain errors
   */
  public async streamChat(messages: LlmMessage[], options?: CompletionOptions): Promise<ReadableStream<Uint8Array>> {
    // Guard: Validate messages
    if (!messages || messages.length === 0) {
      throw this.createDomainError("LLM_VALIDATION_ERROR", "Messages array cannot be empty", 400);
    }

    const body = this.buildBody(messages, options);
    body.stream = true;

    try {
      const headers = this.buildHeaders();
      const response = await this.fetchImpl(this.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      // Guard: Check response status
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw this.createHttpError(response.status, errorText);
      }

      // Guard: Verify streaming body exists
      if (!response.body) {
        throw this.createDomainError("LLM_INVALID_RESPONSE", "Response body is null", 502);
      }

      return response.body;
    } catch (error) {
      throw this.mapHttpErrorToDomain(error);
    }
  }

  /**
   * Builds HTTP headers for OpenRouter API request
   */
  private buildHeaders(): Headers {
    const headers = new Headers({
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    });

    // Add custom headers if provided
    if (this.customHeaders?.referer) {
      headers.set("HTTP-Referer", this.customHeaders.referer);
    }
    if (this.customHeaders?.title) {
      headers.set("X-Title", this.customHeaders.title);
    }

    return headers;
  }

  /**
   * Builds request body for OpenRouter API
   */
  private buildBody(messages: LlmMessage[], options?: CompletionOptions): Record<string, unknown> {
    const model = options?.model ?? this.defaultModel;
    const params = { ...this.defaultParams, ...options?.params };

    const body: Record<string, unknown> = {
      model,
      messages,
      ...params,
    };

    // Add response_format if provided
    if (options?.response_format) {
      body.response_format = options.response_format;
    }

    return body;
  }

  /**
   * Executes POST request and returns parsed JSON
   */
  private async postJson<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const headers = this.buildHeaders();

    const response = await this.fetchImpl(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    // Guard: Check response status before parsing
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw this.createHttpError(response.status, errorText);
    }

    // Parse JSON response
    try {
      return (await response.json()) as T;
    } catch (parseError) {
      throw this.createDomainError("LLM_INVALID_RESPONSE", "Failed to parse JSON response from OpenRouter", 502, {
        parseError: String(parseError),
      });
    }
  }

  /**
   * Maps OpenRouter completion response to our domain model
   */
  private mapCompletionResponse(response: OpenRouterCompletionResponse): LlmCompletionResult {
    // Guard: Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw this.createDomainError("LLM_INVALID_RESPONSE", "No choices in OpenRouter response", 502);
    }

    const firstChoice = response.choices[0];
    if (!firstChoice?.message?.content) {
      throw this.createDomainError("LLM_INVALID_RESPONSE", "No content in OpenRouter response", 502);
    }

    return {
      id: response.id,
      model: response.model,
      created: response.created,
      content: firstChoice.message.content,
      usage: response.usage,
    };
  }

  /**
   * Creates a domain error object
   */
  private createDomainError(
    code: LlmErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ): Error & LlmApiError {
    const error = new Error(message) as Error & LlmApiError;
    error.code = code;
    error.message = message;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  /**
   * Creates an HTTP error from status and text
   */
  private createHttpError(status: number, errorText: string): Error {
    return this.createDomainError(
      this.mapStatusToErrorCode(status),
      `OpenRouter API error (${status}): ${errorText}`,
      status,
      { originalError: errorText }
    );
  }

  /**
   * Maps HTTP status code to domain error code
   */
  private mapStatusToErrorCode(status: number): LlmErrorCode {
    if (status === 401 || status === 403) return "LLM_AUTH_ERROR";
    if (status === 429) return "LLM_RATE_LIMIT";
    if (status === 413) return "LLM_PAYLOAD_TOO_LARGE";
    if (status === 422) return "LLM_VALIDATION_ERROR";
    if (status >= 500) return "LLM_UPSTREAM_ERROR";
    return "LLM_UPSTREAM_ERROR";
  }

  /**
   * Maps various error types to domain errors
   */
  private mapHttpErrorToDomain(error: unknown): Error & LlmApiError {
    // Already a domain error
    if (this.isLlmApiError(error)) {
      return error as Error & LlmApiError;
    }

    // Network/timeout errors
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return this.createDomainError("LLM_TIMEOUT", "Request was aborted", 504);
      }
      if (error.message.includes("fetch") || error.message.includes("network")) {
        return this.createDomainError("LLM_UPSTREAM_ERROR", `Network error: ${error.message}`, 503);
      }
    }

    // Unknown error
    return this.createDomainError("LLM_UPSTREAM_ERROR", `Unexpected error: ${String(error)}`, 500);
  }

  /**
   * Type guard for LlmApiError
   */
  private isLlmApiError(error: unknown): error is Error & LlmApiError {
    return error instanceof Error && "code" in error && "statusCode" in error;
  }
}
