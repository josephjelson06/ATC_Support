import { API_BASE_URL, storageKeys } from './config';
import type { AuthResponse } from './types';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | undefined;
};

const AUTH_REFRESHED_EVENT = 'atc-auth-refreshed';
const AUTH_EXPIRED_EVENT = 'atc-auth-expired';

let refreshInFlight: Promise<AuthResponse | null> | null = null;

const isRecordBody = (value: ApiFetchOptions['body']): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !(value instanceof FormData) && !(value instanceof URLSearchParams) && !(value instanceof Blob);

const parseResponse = async (response: Response) => {
  const responseText = await response.text();
  let responseData: unknown = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  return responseData;
};

export const getStoredToken = () => localStorage.getItem(storageKeys.authToken);

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(storageKeys.authToken, token);
    return;
  }

  localStorage.removeItem(storageKeys.authToken);
};

const performRequest = async <T>(path: string, options: ApiFetchOptions = {}, tokenOverride?: string | null): Promise<T> => {
  const { auth = true, body, headers, ...rest } = options;
  const token = tokenOverride === undefined ? getStoredToken() : tokenOverride;
  const requestHeaders = new Headers(headers);

  if (auth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;

  if (isRecordBody(body)) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  } else {
    requestBody = body;
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    credentials: 'include',
    headers: requestHeaders,
    body: requestBody,
  });

  const responseData = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? String(responseData.message)
        : 'Request failed.',
      typeof responseData === 'object' && responseData !== null && 'details' in responseData ? responseData.details : undefined,
    );
  }

  return responseData as T;
};

export const refreshAccessToken = async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await performRequest<AuthResponse>('/auth/refresh', {
          method: 'POST',
          auth: false,
        });

        setStoredToken(response.token);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(AUTH_REFRESHED_EVENT, { detail: response.user }));
        }

        return response;
      } catch {
        setStoredToken(null);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }

        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
};

export const authEvents = {
  refreshed: AUTH_REFRESHED_EVENT,
  expired: AUTH_EXPIRED_EVENT,
} as const;

export const apiFetch = async <T>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  try {
    return await performRequest<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || !options.auth || error.status !== 401 || path.startsWith('/auth/')) {
      throw error;
    }

    const refreshResponse = await refreshAccessToken();

    if (!refreshResponse?.token) {
      throw error;
    }

    return performRequest<T>(path, options, refreshResponse.token);
  }
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
};
