import path from 'path';
import dotenv from 'dotenv';

// Dynamically load the appropriate .env file based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });

interface AppConfig {
  port: number;
  env: string;
  
  // Jira Configuration
  jiraUrl: string;
  jiraUser: string;
  jiraToken: string;
  
  // GitLab Configuration
  gitlabUrl: string;
  gitlabHost: string;
  gitlabToken: string;
  
  // Confluence Configuration
  confluenceUrl: string;
  confluenceUser: string;
  confluenceToken: string;
  
  // Proxy Configuration
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
  nodeTlsRejectUnauthorized: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  
  // Jira Configuration
  jiraUrl: requireEnv('JIRA_URL'),
  jiraUser: requireEnv('JIRA_USER'),
  jiraToken: requireEnv('JIRA_TOKEN'),
  
  // GitLab Configuration
  gitlabUrl: optionalEnv('GITLAB_URL', 'https://natwest.gitlab-dedicated.com') || '',
  gitlabHost: optionalEnv('GITLAB_HOST', 'https://natwest.gitlab-dedicated.com') || '',
  gitlabToken: requireEnv('GITLAB_TOKEN'),
  
  // Confluence Configuration
  confluenceUrl: requireEnv('CONFLUENCE_URL'),
  confluenceUser: optionalEnv('CONFLUENCE_USER', process.env.JIRA_USER) || '',
  confluenceToken: requireEnv('CONFLUENCE_TOKEN'),
  
  // Proxy Configuration
  httpProxy: optionalEnv('HTTP_PROXY'),
  httpsProxy: optionalEnv('HTTPS_PROXY'),
  noProxy: optionalEnv('NO_PROXY'),
  nodeTlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1',
};

export default config;