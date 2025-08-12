import { Request, Response } from 'express';
import { fetchWithProxy } from '../../utils/fetchWithProxy';
import config from '../../config';
import logger from '../../utils/logger';
import { getConfluenceHeaders } from '../../utils/headers';

export const updateConfluencePage = async (req: Request, res: Response): Promise<void> => {
  const { pageId, title, body, auth } = req.body;
  if (!pageId || !title || !body || !auth) {
    logger.warn('Missing required fields in updateConfluencePage request');
    res.status(400).json({ error: 'Missing required fields: pageId, title, body, auth' });
    return;
  }
  
  try {
    const response = await fetchWithProxy(
      `${config.confluenceUrl}/wiki/rest/api/content/${pageId}`,
      {
        method: 'PUT',
        headers: {
          ...getConfluenceHeaders(),
          'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.token}`).toString('base64')}`,
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
    logger.info(`Confluence page ${pageId} updated successfully`);
    res.json({ status: 'success', data });
  } catch (error: any) {
    logger.error(`Failed to update Confluence page: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const testConfluenceConnection = async (_req: Request, res: Response): Promise<void> => {
  if (!config.confluenceUrl || !config.confluenceUser || !config.confluenceToken) {
    logger.error('Missing Confluence environment variables');
    res.status(500).json({ status: 'error', message: 'Missing Confluence environment variables' });
    return;
  }
  
  try {
    await fetchWithProxy(`${config.confluenceUrl}/wiki/rest/api/user/current`, {
      method: 'GET',
      headers: getConfluenceHeaders(),
    });
    logger.info('Confluence connection test successful');
    res.json({ status: 'success', message: 'Connected to Confluence successfully' });
  } catch (error: any) {
    logger.error(`Confluence connection test failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
