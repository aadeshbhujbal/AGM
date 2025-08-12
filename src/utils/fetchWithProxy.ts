import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import config from '../config';
import logger from './logger';

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
  const { method = 'GET', headers = {}, body, auth, timeout = 30000 } = options;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authentication if provided
  if (auth) {
    const authString = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    requestHeaders['Authorization'] = `Basic ${authString}`;
  }

  // Configure proxy agents
  let agent: HttpsProxyAgent<string> | HttpProxyAgent<string> | undefined;
  
  if (url.startsWith('https://') && config.httpsProxy) {
    agent = new HttpsProxyAgent(config.httpsProxy);
    logger.debug(`Using HTTPS proxy: ${config.httpsProxy}`);
  } else if (url.startsWith('http://') && config.httpProxy) {
    agent = new HttpProxyAgent(config.httpProxy);
    logger.debug(`Using HTTP proxy: ${config.httpProxy}`);
  }

  // Prepare fetch options
  const fetchOptions: any = {
    method,
    headers: requestHeaders,
    timeout,
  };

  if (agent) {
    fetchOptions.agent = agent;
  }

  if (body) {
    fetchOptions.body = body;
  }

  // Disable TLS verification if configured
  if (config.nodeTlsRejectUnauthorized === false) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    logger.warn('TLS certificate verification disabled');
  }

  try {
    logger.debug(`Making ${method} request to: ${url}`);
    
    const response = await fetch(url, fetchOptions);
    
    logger.debug(`Response status: ${response.status} ${response.statusText}`);
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      json: () => response.json(),
      text: () => response.text(),
    };
  } catch (error) {
    logger.error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}; 