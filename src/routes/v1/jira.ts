import { Router } from 'express';
import { 
  getReleasesFromJira, 
  getSprintsFromJira,
  getIssuesFromJira, 
  getEpicsFromJira,
  getBoardDetails,
  getAllBoards,
  getBoardConfiguration,
  getBoardIssues,
  getBoardBacklog,
  getBoardRapidViews,
  getBoardStatistics
} from '../../services/jiraService';
import { fetchWithProxy } from '../../utils/fetchWithProxy';

// Import validateJiraCredentials from jiraService
function validateJiraCredentials() {
  const JIRA_URL = process.env.JIRA_URL;
  const JIRA_USER = process.env.JIRA_USER;
  const JIRA_TOKEN = process.env.JIRA_TOKEN;
  
  if (!JIRA_URL || !JIRA_USER || !JIRA_TOKEN) {
    throw new Error('Jira credentials are not set in environment variables');
  }
  return { 
    url: JIRA_URL, 
    user: JIRA_USER, 
    token: JIRA_TOKEN 
  };
}

const router = Router();

/**
 * @swagger
 * /api/v1/jira/releases:
 *   get:
 *     summary: Get Jira releases
 *     description: Returns a list of releases for a Jira project.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *     responses:
 *       200:
 *         description: Releases array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing required query param
 *       500:
 *         description: Server error
 */
router.get('/releases', async (req, res) => {
  try {
    const { project } = req.query;
    if (!project) {
      return res.status(400).json({ error: 'Missing required query param: project' });
    }
    const releases = await getReleasesFromJira(project as string);
    res.json(releases);
  } catch (err) {
    console.error('Error in releases endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/sprints:
 *   get:
 *     summary: Get Jira sprints
 *     description: Returns a list of sprints for a Jira board.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Sprints array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing required query param
 *       500:
 *         description: Server error
 */
router.get('/sprints', async (req, res) => {
  try {
    const { boardId } = req.query;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required query param: boardId' });
    }
    const sprints = await getSprintsFromJira(boardId as string);
    res.json(sprints);
  } catch (err) {
    console.error('Error in sprints endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/issues:
 *   get:
 *     summary: Get Jira issues
 *     description: Returns a list of issues for a Jira project.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: query
 *         name: jql
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira Query Language (JQL) string, e.g. 'project=FRN'
 *     responses:
 *       200:
 *         description: Issues array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing required query param
 *       500:
 *         description: Server error
 */
router.get('/issues', async (req, res) => {
  try {
    const { jql } = req.query;
    if (!jql) {
      return res.status(400).json({ error: 'Missing required query param: jql' });
    }
    const issues = await getIssuesFromJira(jql as string);
    res.json(issues);
  } catch (err) {
    console.error('Error in issues endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/epics:
 *   get:
 *     summary: Get Jira epics
 *     description: Returns a list of epics for a Jira board.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Epics array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing required query param
 *       500:
 *         description: Server error
 */
router.get('/epics', async (req, res) => {
  try {
    const { boardId } = req.query;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required query param: boardId' });
    }
    const epics = await getEpicsFromJira(boardId as string);
    res.json(epics);
  } catch (err) {
    console.error('Error in epics endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});



/**
 * @swagger
 * /api/v1/jira/boards:
 *   get:
 *     summary: Get all boards
 *     description: Returns all boards with optional filtering by project key and board type. Use this unified endpoint for all board operations.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: query
 *         name: projectKey
 *         schema:
 *           type: string
 *         description: Filter boards by project key (e.g., FRN)
 *       - in: query
 *         name: boardType
 *         schema:
 *           type: string
 *         description: Filter boards by type (e.g., scrum, kanban)
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *         description: "Include detailed board information (default: false)"
 *     responses:
 *       200:
 *         description: Boards array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
router.get('/boards', async (req, res) => {
  try {
    const { projectKey, boardType, includeDetails } = req.query;
    const options: { projectKey?: string; boardType?: string; includeDetails?: boolean } = {};
    
    if (projectKey) options.projectKey = projectKey as string;
    if (boardType) options.boardType = boardType as string;
    if (includeDetails) options.includeDetails = includeDetails === 'true';
    
    console.log(`[DEBUG] Fetching boards with options:`, options);
    
    const boards = await getAllBoards(options);
    
    console.log(`[DEBUG] Found ${boards.length} boards`);
    if (boards.length === 0 && projectKey) {
      console.log(`[DEBUG] No boards found for project: ${projectKey}. This might indicate:`);
      console.log(`[DEBUG] 1. Project key is incorrect`);
      console.log(`[DEBUG] 2. Project has no boards configured`);
      console.log(`[DEBUG] 3. User doesn't have access to project boards`);
    }
    
    res.json(boards);
  } catch (err) {
    console.error('Error in boards endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}:
 *   get:
 *     summary: Get board details
 *     description: Returns detailed information about a specific board.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Board details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    const boardDetails = await getBoardDetails(boardId);
    res.json(boardDetails);
  } catch (err) {
    console.error('Error in board details endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}/configuration:
 *   get:
 *     summary: Get board configuration
 *     description: Returns board configuration including columns and statuses.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Board configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId/configuration', async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    const boardConfig = await getBoardConfiguration(boardId);
    res.json(boardConfig);
  } catch (err) {
    console.error('Error in board configuration endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}/issues:
 *   get:
 *     summary: Get board issues
 *     description: Returns issues for a specific board with optional filtering.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: jql
 *         schema:
 *           type: string
 *         description: JQL filter for issues
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *         description: Maximum number of results to return
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to include
 *     responses:
 *       200:
 *         description: Board issues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId/issues', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { jql, maxResults, fields, expand } = req.query;
    
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    
    const options: {
      jql?: string;
      maxResults?: number;
      fields?: string[];
      expand?: string[];
    } = {};
    
    if (jql) options.jql = jql as string;
    if (maxResults) options.maxResults = parseInt(maxResults as string);
    if (fields) options.fields = (fields as string).split(',');
    if (expand) options.expand = (expand as string).split(',');
    
    const boardIssues = await getBoardIssues(boardId, options);
    res.json(boardIssues);
  } catch (err) {
    console.error('Error in board issues endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}/backlog:
 *   get:
 *     summary: Get board backlog
 *     description: Returns backlog issues for a specific board.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Board backlog
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId/backlog', async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    const boardBacklog = await getBoardBacklog(boardId);
    res.json(boardBacklog);
  } catch (err) {
    console.error('Error in board backlog endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}/rapid-views:
 *   get:
 *     summary: Get board rapid views
 *     description: Returns rapid views for velocity charts.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Board rapid views
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId/rapid-views', async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    const rapidViews = await getBoardRapidViews(boardId);
    res.json(rapidViews);
  } catch (err) {
    console.error('Error in board rapid views endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/jira/boards/{boardId}/statistics:
 *   get:
 *     summary: Get board statistics
 *     description: Returns comprehensive statistics and metrics for a board.
 *     tags:
 *       - Jira
 *     parameters:
 *       - in: path
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *     responses:
 *       200:
 *         description: Board statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required path param
 *       500:
 *         description: Server error
 */
router.get('/boards/:boardId/statistics', async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing required path param: boardId' });
    }
    const boardStats = await getBoardStatistics(boardId);
    res.json(boardStats);
  } catch (err) {
    console.error('Error in board statistics endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});


export default router; 