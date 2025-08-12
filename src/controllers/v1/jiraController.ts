import { Request, Response } from 'express';
import { getReleasesFromJira, getSprintsFromJira, getIssuesFromJira, getEpicsFromJira } from '../../services/jiraService';
import { fetchWithProxy } from '../../utils/fetchWithProxy';
import config from '../../config';
import logger from '../../utils/logger';

export const getReleases = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectName = req.query.project as string | undefined;
    const releases = await getReleasesFromJira(projectName);
    res.json(releases);
  } catch (error) {
    logger.error(`Failed to fetch releases: ${(error as Error).message}`);
    res.status(500).json({ error: 'Failed to fetch releases', details: (error as Error).message });
  }
};

export const getSprints = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = req.query.boardId as string;
    if (!boardId) {
      res.status(400).json({ error: 'Missing boardId param' });
      return;
    }
    const sprints = await getSprintsFromJira(boardId);
    res.json(sprints);
  } catch (error) {
    logger.error(`Failed to fetch sprints: ${(error as Error).message}`);
    res.status(500).json({ error: 'Failed to fetch sprints', details: (error as Error).message });
  }
};

export const getIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const jql = req.query.jql as string;
    if (!jql) {
      res.status(400).json({ error: 'Missing jql param' });
      return;
    }
    const issues = await getIssuesFromJira(jql);
    res.json(issues);
  } catch (error) {
    logger.error(`Failed to fetch issues: ${(error as Error).message}`);
    res.status(500).json({ error: 'Failed to fetch issues', details: (error as Error).message });
  }
};

export const getEpics = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = req.query.boardId as string;
    if (!boardId) {
      res.status(400).json({ error: 'Missing boardId param' });
      return;
    }
    const epics = await getEpicsFromJira(boardId);
    res.json(epics);
  } catch (error) {
    logger.error(`Failed to fetch epics: ${(error as Error).message}`);
    res.status(500).json({ error: 'Failed to fetch epics', details: (error as Error).message });
  }
};

export const testJiraConnection = async (req: Request, res: Response): Promise<void> => {
  if (!config.jiraUrl || !config.jiraUser || !config.jiraToken) {
    logger.error('Missing Jira environment variables');
    res.status(500).json({ status: 'error', message: 'Missing Jira environment variables' });
    return;
  }
  
  try {
    await fetchWithProxy(`${config.jiraUrl}/rest/api/3/myself`, {
      method: 'GET',
      auth: { username: config.jiraUser, password: config.jiraToken },
    });
    logger.info('Jira connection test successful');
    res.json({ status: 'success', message: 'Connected to Jira successfully' });
  } catch (error: any) {
    logger.error(`Jira connection test failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
