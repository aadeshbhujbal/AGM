export * from './mergeRequests';
export * from './velocity';
export * from './piPlanning';
export * from './jira';

export interface ServiceError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ServiceConfiguration {
  jiraBaseUrl: string;
  jiraUsername: string;
  jiraApiToken: string;
  gitlabToken: string;
  gitlabHost: string;
}

export interface OrchestrationServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  executionTimeMs: number;
}
