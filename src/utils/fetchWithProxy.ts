import { request, ProxyAgent } from 'undici';
import { createNetworkError, createParseError, createValidationError, NetworkError, ParseError } from '../types/errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

interface FetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  auth?: { username: string; password: string };
  timeout?: number;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export const fetchWithProxy = async (url: string, options: FetchOptions = {}): Promise<FetchResponse> => {
  if (!url) throw createValidationError('Invalid URL provided', 'url', url);

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.auth) {
    const { username, password } = options.auth;
    headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  const requestOptions: {
    method: HttpMethod;
    headers: Record<string, string>;
    body?: string;
    dispatcher?: ProxyAgent;
    signal?: AbortSignal;
  } = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) requestOptions.body = options.body;
  if (proxyUrl) requestOptions.dispatcher = new ProxyAgent(proxyUrl);
  if (options.timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), options.timeout);
    requestOptions.signal = controller.signal;
  }

  try {
    const response = await request(url, requestOptions);
    const responseText = await response.body.text();

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      statusText: response.statusCode === 200 ? 'OK' : 'Unknown',
      headers: response.headers as Record<string, string>,
      json: async () => {
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          throw createParseError(
            `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            'application/json',
            responseText
          );
        }
      },
      text: async () => responseText,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw createNetworkError(`Request to ${url} failed: ${error.message}`, url);
    } else {
      throw createNetworkError(`Request to ${url} failed: ${String(error)}`, url);
    }
  }
}; 