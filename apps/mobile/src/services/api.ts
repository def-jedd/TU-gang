import type { ExplainRequest, ExplainResponse, HealthResponse, Provider } from '../types/tutor';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, USE_MOCK } from './config';
import { TutorError, type TutorErrorKind } from './errors';
import { mockExplain } from './mockTutor';

export { TutorError, type TutorErrorKind };

export const apiMode: 'mock' | 'live' = USE_MOCK ? 'mock' : 'live';

/**
 * POST /api/explain. Rejects only with TutorError so the UI can show a
 * friendly message per `kind` instead of a raw stack trace.
 */
export async function explain(request: ExplainRequest, signal?: AbortSignal): Promise<ExplainResponse> {
  if (USE_MOCK || !API_BASE_URL) return mockExplain(request, signal);

  const body = await requestJson(
    `${API_BASE_URL}/api/explain`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
    },
    REQUEST_TIMEOUT_MS,
    signal,
  );
  return normalizeResponse(body, request);
}

export type HealthResult =
  | { ok: true; mode: 'mock' }
  | { ok: true; mode: 'live'; provider?: string }
  | { ok: false; mode: 'live'; error: TutorErrorKind };

/** GET /api/health — used for the small connection dot on the Home screen. */
export async function checkHealth(): Promise<HealthResult> {
  if (USE_MOCK || !API_BASE_URL) return { ok: true, mode: 'mock' };
  try {
    const body = (await requestJson(`${API_BASE_URL}/api/health`, { method: 'GET' }, 5_000)) as HealthResponse;
    return { ok: true, mode: 'live', provider: body?.provider };
  } catch (error) {
    return { ok: false, mode: 'live', error: error instanceof TutorError ? error.kind : 'network' };
  }
}

export async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  outerSignal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (outerSignal?.aborted) controller.abort();
  outerSignal?.addEventListener('abort', forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw abortReason() ?? new TutorError('network', `Could not reach ${url}`);
    }

    if (response.status === 204) return null; // e.g. DELETE /api/voice/sessions/:id

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      const reason = abortReason();
      if (reason) throw reason;
      // fall through: a non-JSON error page is handled below
    }

    if (!response.ok) {
      const serverMessage =
        json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : `HTTP ${response.status}`;
      throw new TutorError('server', serverMessage, response.status);
    }
    if (json === null) throw new TutorError('bad_response', 'Response was not JSON');
    return json;
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', forwardAbort);
  }

  function abortReason(): TutorError | null {
    if (timedOut) return new TutorError('timeout', `No answer after ${timeoutMs / 1000}s`);
    if (outerSignal?.aborted) return new TutorError('cancelled', 'Cancelled');
    return null;
  }
}

const PROVIDERS: readonly Provider[] = ['ollama', 'kiro', 'quick', 'approved_fallback', 'mock'];

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Defensive parsing: the backend is being built at the same time as this app.
 * Only `explanation` is truly required to show something useful.
 */
export function normalizeResponse(raw: unknown, request: ExplainRequest): ExplainResponse {
  if (!raw || typeof raw !== 'object') throw new TutorError('bad_response', 'Empty response');
  const data = raw as Record<string, unknown>;

  if (!isString(data.explanation) || data.explanation.trim() === '') {
    throw new TutorError('bad_response', 'Response has no explanation');
  }

  const keyPoints = Array.isArray(data.key_points)
    ? data.key_points.filter(isString).map((point) => point.trim()).filter(Boolean)
    : [];

  return {
    request_id: isString(data.request_id) ? data.request_id : 'unknown',
    topic: isString(data.topic) ? data.topic : request.topic,
    language: request.language,
    explanation: data.explanation.trim(),
    example: isString(data.example) ? data.example.trim() : '',
    key_points: keyPoints,
    source_ids: Array.isArray(data.source_ids) ? data.source_ids.filter(isString) : [],
    provider: PROVIDERS.includes(data.provider as Provider) ? (data.provider as Provider) : 'unknown',
  };
}
