import path from 'path';
import dotenv from 'dotenv';

// Dynamically load the appropriate .env file based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });

interface AppConfig {
  port: number;
  jiraUrl: string;
  jiraUser: string;
  jiraToken: string;
  gitlabToken: string;
  gitlabHost: string;
  confluenceUrl: string;
  confluenceToken: string; 
  env: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  jiraUrl: requireEnv('JIRA_URL'),
  jiraUser: requireEnv('JIRA_USER'),
  jiraToken: requireEnv('JIRA_TOKEN'),
  gitlabToken: requireEnv('GITLAB_TOKEN'),
  gitlabHost: process.env.GITLAB_HOST || 'https://natwest.gitlab-dedicated.com/',
  confluenceUrl: requireEnv('CONFLUENCE_URL'),
  confluenceToken: requireEnv('CONFLUENCE_TOKEN'), // Add this
  env: process.env.NODE_ENV || 'development',
};

export default config;