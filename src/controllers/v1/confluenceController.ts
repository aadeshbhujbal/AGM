import { Request, Response } from 'express';
import { fetchWithProxy } from '../../utils/fetchWithProxy';

export const updateConfluencePage = async (req: Request, res: Response): Promise<void> => {
  const { pageId, title, body, auth } = req.body;
  if (!pageId || !title || !body || !auth) {
    res.status(400).json({ error: 'Missing required fields: pageId, title, body, auth' });
    return;
  }
  try {
    const response = await fetchWithProxy(
      `https://natwest.atlassian.net/wiki/rest/api/content/${pageId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.token}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pageId,
          type: 'page',
          title,
          body: { storage: { value: body, representation: 'storage' } },
          version: { number: 2 }, // You should fetch and increment the current version
        }),
      }
    );
    const data = await response.json();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const testConfluenceConnection = async (req: Request, res: Response): Promise<void> => {
  const confluenceUrl = process.env.CONFLUENCE_URL;
  const username = process.env.CONFLUENCE_USER;
  const token = process.env.CONFLUENCE_TOKEN;
  if (!confluenceUrl || !username || !token) {
    res.status(500).json({ status: 'error', message: 'Missing Confluence environment variables' });
    return;
  }
  try {
    await fetchWithProxy(`${confluenceUrl}/wiki/rest/api/user/current`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
    res.json({ status: 'success', message: 'Connected to Confluence successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
