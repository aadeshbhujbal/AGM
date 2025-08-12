import { Request, Response } from 'express';
import { getReleasesFromJira, getSprintsFromJira, getIssuesFromJira, getEpicsFromJira } from '../../services/jiraService';
import { fetchWithProxy } from '../../utils/fetchWithProxy';

export const getReleases = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectName = req.query.project as string | undefined;
    const releases = await getReleasesFromJira(projectName);
    res.json(releases);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch epics', details: (error as Error).message });
  }
};

export const testJiraConnection = async (req: Request, res: Response): Promise<void> => {
  const JIRA_URL = process.env.JIRA_URL;
  const JIRA_USER = process.env.JIRA_USER;
  const JIRA_TOKEN = process.env.JIRA_TOKEN;
  if (!JIRA_URL || !JIRA_USER || !JIRA_TOKEN) {
    res.status(500).json({ status: 'error', message: 'Missing Jira environment variables' });
    return;
  }
  try {
    await fetchWithProxy(`${JIRA_URL}/rest/api/3/myself`, {
      method: 'GET',
      auth: { username: JIRA_USER, password: JIRA_TOKEN },
    });
    res.json({ status: 'success', message: 'Connected to Jira successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
