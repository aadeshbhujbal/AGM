import { Router } from 'express';
import { piPlanningSummaryService } from '../../services/piPlanningService';

const router = Router();

/**
 * @swagger
 * /api/v1/pi-planning/summary:
 *   get:
 *     summary: Get PI Planning analytics summary
 *     description: Returns comprehensive PI Planning analytics including releases, sprints, story points, RAG status, and epic breakdowns.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key or name
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: PI Planning analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 releases:
 *                   type: array
 *                   description: List of releases in the PI date range
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: 
 *                         type: string
 *                       name:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                       releaseDate:
 *                         type: string
 *                       released:
 *                         type: boolean
 *                       overdue:
 *                         type: boolean
 *                 sprints:
 *                   type: array
 *                   description: List of sprints in the PI date range
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       name:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                       endDate:
 *                         type: string
 *                 totalStoryPoints:
 *                   type: number
 *                   description: Total story points in the PI
 *                 completedStoryPoints:
 *                   type: number
 *                   description: Completed story points
 *                 inProgressStoryPoints:
 *                   type: number
 *                   description: Story points in progress
 *                 toDoStoryPoints:
 *                   type: number
 *                   description: Story points to do
 *                 completedPercentage:
 *                   type: number
 *                   description: Percentage of completed story points
 *                 ragStatus:
 *                   type: string
 *                   description: RAG status (Red/Amber/Green)
 *                   enum: [Red, Amber, Green, PI Planning]
 *                 epicProgress:
 *                   type: object
 *                   description: Progress breakdown by epic
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       completed:
 *                         type: number
 *                       inProgress:
 *                         type: number
 *                       toDo:
 *                         type: number
 *                       total:
 *                         type: number
 *                       completedPct:
 *                         type: number
 *                       rag:
 *                         type: string
 *                       raid:
 *                         type: string
 *                       wsjf:
 *                         type: string
 *                       piScope:
 *                         type: string
 *                       progress:
 *                         type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/summary', async (req, res) => {
  try {
    const { project, boardId, piStartDate, piEndDate } = req.query;
    if (!project || !boardId || !piStartDate || !piEndDate) {
      return res.status(400).json({ error: 'Missing required query params: project, boardId, piStartDate, piEndDate' });
    }
    const result = await piPlanningSummaryService({
      project: project as string,
      boardId: boardId as string,
      piStartDate: piStartDate as string,
      piEndDate: piEndDate as string,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// New granular endpoints for PI Planning summary fields
const getSummaryField = (field: string) => async (req: any, res: any) => {
  try {
    const { project, boardId, piStartDate, piEndDate } = req.query;
    if (!project || !boardId || !piStartDate || !piEndDate) {
      return res.status(400).json({ error: 'Missing required query params: project, boardId, piStartDate, piEndDate' });
    }

    // Map the endpoint names to the actual field names in the response
    const fieldMapping: Record<string, string> = {
      'sprints': 'sprints',
      'issues': 'issues',
      'story-points': 'storyPoints',
      'rag-status': 'ragStatus',
      'epic-breakdown': 'epicBreakdown',
      'sprint-breakdown': 'sprintBreakdown',
      'burnup': 'burnup',
      'raid': 'raid',
      'wsjf': 'wsjf',
      'pi-scope': 'piScope',
      'progress': 'progress',
      'releases': 'releases'
    };

    const actualField = fieldMapping[field] || field;

    const result = await piPlanningSummaryService({
      project: project as string,
      boardId: boardId as string,
      piStartDate: piStartDate as string,
      piEndDate: piEndDate as string,
    });

    if (!(actualField in result)) {
      return res.status(404).json({ error: `Field ${field} not found in summary` });
    }

    // Use type assertion to handle dynamic field access
    res.json({ [field]: (result as Record<string, any>)[actualField] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

/**
 * @swagger
 * /api/v1/pi-planning/releases:
 *   get:
 *     summary: Get PI Planning releases
 *     description: Returns only the releases array from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Releases array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 releases:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/releases', getSummaryField('releases'));
/**
 * @swagger
 * /api/v1/pi-planning/sprints:
 *   get:
 *     summary: Get PI Planning sprints
 *     description: Returns only the sprints array from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Sprints array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprints:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/sprints', getSummaryField('sprints'));
/**
 * @swagger
 * /api/v1/pi-planning/issues:
 *   get:
 *     summary: Get PI Planning issues
 *     description: Returns only the issues array from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Issues array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/issues', getSummaryField('issues'));
/**
 * @swagger
 * /api/v1/pi-planning/story-points:
 *   get:
 *     summary: Get PI Planning story points
 *     description: Returns only the storyPoints value from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Story points value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 storyPoints:
 *                   type: integer
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/story-points', getSummaryField('story-points'));
/**
 * @swagger
 * /api/v1/pi-planning/rag-status:
 *   get:
 *     summary: Get PI Planning RAG status
 *     description: Returns only the ragStatus value from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: RAG status value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ragStatus:
 *                   type: string
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/rag-status', getSummaryField('rag-status'));
/**
 * @swagger
 * /api/v1/pi-planning/epic-breakdown:
 *   get:
 *     summary: Get PI Planning epic breakdown
 *     description: Returns only the epicBreakdown object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Epic breakdown object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 epicBreakdown:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/epic-breakdown', getSummaryField('epic-breakdown'));
/**
 * @swagger
 * /api/v1/pi-planning/sprint-breakdown:
 *   get:
 *     summary: Get PI Planning sprint breakdown
 *     description: Returns only the sprintBreakdown object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Sprint breakdown object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprintBreakdown:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/sprint-breakdown', getSummaryField('sprint-breakdown'));
/**
 * @swagger
 * /api/v1/pi-planning/burnup:
 *   get:
 *     summary: Get PI Planning burnup
 *     description: Returns only the burnup object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Burnup object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 burnup:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/burnup', getSummaryField('burnup'));
/**
 * @swagger
 * /api/v1/pi-planning/raid:
 *   get:
 *     summary: Get PI Planning RAID
 *     description: Returns only the raid object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: RAID object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 raid:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/raid', getSummaryField('raid'));
/**
 * @swagger
 * /api/v1/pi-planning/wsjf:
 *   get:
 *     summary: Get PI Planning WSJF
 *     description: Returns only the wsjf object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: WSJF object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wsjf:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/wsjf', getSummaryField('wsjf'));
/**
 * @swagger
 * /api/v1/pi-planning/pi-scope:
 *   get:
 *     summary: Get PI Planning PI Scope
 *     description: Returns only the piScope object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: PI Scope object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 piScope:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/pi-scope', getSummaryField('pi-scope'));
/**
 * @swagger
 * /api/v1/pi-planning/progress:
 *   get:
 *     summary: Get PI Planning progress
 *     description: Returns only the progress object from the PI Planning summary.
 *     tags:
 *       - PI Planning
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira board ID
 *       - in: query
 *         name: piStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: PI end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Progress object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   type: object
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/progress', getSummaryField('progress'));

export default router; 