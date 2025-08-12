import config from '../config';

export interface ServiceHeaders {
  jira: Record<string, string>;
  confluence: Record<string, string>;
  gitlab: Record<string, string>;
}

export function getJiraHeaders(): Record<string, string> {
  return {
    'Authorization': `Basic ${Buffer.from(`${config.jiraUser}:${config.jiraToken}`).toString('base64')}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export function getConfluenceHeaders(): Record<string, string> {
  return {
    'Authorization': `Basic ${Buffer.from(`${config.jiraUser}:${config.confluenceToken}`).toString('base64')}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export function getGitlabHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${config.gitlabToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export function getServiceHeaders(): ServiceHeaders {
  return {
    jira: getJiraHeaders(),
    confluence: getConfluenceHeaders(),
    gitlab: getGitlabHeaders(),
  };
}

export function getAuthHeaders(service: 'jira' | 'confluence' | 'gitlab'): Record<string, string> {
  switch (service) {
    case 'jira':
      return getJiraHeaders();
    case 'confluence':
      return getConfluenceHeaders();
    case 'gitlab':
      return getGitlabHeaders();
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

