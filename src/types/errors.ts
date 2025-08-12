export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

export interface NetworkError extends ApiError {
  code: 'NETWORK_ERROR';
  url?: string;
  statusCode?: number;
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: unknown;
}

export interface AuthenticationError extends ApiError {
  code: 'AUTHENTICATION_ERROR';
  service?: string;
}

export interface AuthorizationError extends ApiError {
  code: 'AUTHORIZATION_ERROR';
  resource?: string;
  action?: string;
}

export interface ServiceError extends ApiError {
  code: 'SERVICE_ERROR';
  service: string;
  operation?: string;
}

export interface ParseError extends ApiError {
  code: 'PARSE_ERROR';
  contentType: string;
  data?: string;
}

export type ApplicationError = 
  | NetworkError 
  | ValidationError 
  | AuthenticationError 
  | AuthorizationError 
  | ServiceError 
  | ParseError;

export function isNetworkError(error: unknown): error is NetworkError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NETWORK_ERROR';
}

export function isValidationError(error: unknown): error is ValidationError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'VALIDATION_ERROR';
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'AUTHENTICATION_ERROR';
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'AUTHORIZATION_ERROR';
}

export function isServiceError(error: unknown): error is ServiceError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'SERVICE_ERROR';
}

export function isParseError(error: unknown): error is ParseError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'PARSE_ERROR';
}

export function createNetworkError(message: string, url?: string, statusCode?: number): NetworkError {
  return {
    message,
    code: 'NETWORK_ERROR',
    url,
    statusCode
  };
}

export function createValidationError(message: string, field?: string, value?: unknown): ValidationError {
  return {
    message,
    code: 'VALIDATION_ERROR',
    field,
    value
  };
}

export function createAuthenticationError(message: string, service?: string): AuthenticationError {
  return {
    message,
    code: 'AUTHENTICATION_ERROR',
    service
  };
}

export function createAuthorizationError(message: string, resource?: string, action?: string): AuthorizationError {
  return {
    message,
    code: 'AUTHORIZATION_ERROR',
    resource,
    action
  };
}

export function createServiceError(message: string, service: string, operation?: string): ServiceError {
  return {
    message,
    code: 'SERVICE_ERROR',
    service,
    operation
  };
}

export function createParseError(message: string, contentType: string, data?: string): ParseError {
  return {
    message,
    code: 'PARSE_ERROR',
    contentType,
    data
  };
} 