import { Router } from 'express';
import { getEpicSummary, getEpicDetails } from '../../services/epicService';

const router = Router();

/**
 * @swagger
 * /api/v1/epic/summary:
 *   get:
 *     summary: Get epic summary table data
 *     description: Returns epic data including PI Objectives, Progress Updates, RAID information, and Story Points tracking.
 *     tags:
 *       - Epic
 *     parameters:
 *       - in: query
 *         name: projectKey
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
 *         required: false
 *         description: PI start date (YYYY-MM-DD)
 *       - in: query
 *         name: piEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: PI end date (YYYY-MM-DD)
 *       - in: query
 *         name: sprintIds
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of sprint IDs
 *     responses:
 *       200:
 *         description: Epic summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   epic:
 *                     type: string
 *                     description: Epic URL and key
 *                   piObjective:
 *                     type: string
 *                     description: Program Increment Objective
 *                   piProgressUpdate:
 *                     type: string
 *                     description: PI Progress Update
 *                   raid:
 *                     type: string
 *                     description: RAID information (Risks, Assumptions, Issues, Dependencies)
 *                   storyPoints:
 *                     type: string
 *                     description: Formatted story points (OSP (+4SP)/4SP / 2SP)
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/summary', async (req, res) => {
  try {
    const { projectKey, boardId, piStartDate, piEndDate, sprintIds } = req.query;
    
    if (!projectKey || !boardId) {
      return res.status(400).json({ error: 'Missing required parameters: projectKey and boardId' });
    }

    const sprintIdsArray = sprintIds ? (sprintIds as string).split(',').map(id => parseInt(id.trim(), 10)) : undefined;

    const result = await getEpicSummary({
      projectKey: projectKey as string,
      boardId: boardId as string,
      piStartDate: piStartDate as string,
      piEndDate: piEndDate as string,
      sprintIds: sprintIdsArray
    });

    res.json(result);
  } catch (err) {
    console.error('Error in epic summary endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/epic/{epicKey}:
 *   get:
 *     summary: Get detailed epic information
 *     description: Returns detailed information for a specific epic including all fields and calculated metrics.
 *     tags:
 *       - Epic
 *     parameters:
 *       - in: path
 *         name: epicKey
 *         schema:
 *           type: string
 *         required: true
 *         description: Epic key (e.g., RAFDT-72)
 *     responses:
 *       200:
 *         description: Epic details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 epicKey:
 *                   type: string
 *                 epicSummary:
 *                   type: string
 *                 epicUrl:
 *                   type: string
 *                 storyPoints:
 *                   type: object
 *                   properties:
 *                     original:
 *                       type: number
 *                     added:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     total:
 *                       type: number
 *                 piObjective:
 *                   type: string
 *                 piProgressUpdate:
 *                   type: string
 *                 raid:
 *                   type: object
 *                   properties:
 *                     risks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     assumptions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: string
 *                     dependencies:
 *                       type: array
 *                       items:
 *                         type: string
 *                 status:
 *                   type: string
 *                 assignee:
 *                   type: string
 *                 created:
 *                   type: string
 *                 updated:
 *                   type: string
 *       404:
 *         description: Epic not found
 *       500:
 *         description: Server error
 */
router.get('/:epicKey', async (req, res) => {
  try {
    const { epicKey } = req.params;
    
    if (!epicKey) {
      return res.status(400).json({ error: 'Missing epic key' });
    }

    const result = await getEpicDetails(epicKey);
    
    if (!result) {
      return res.status(404).json({ error: 'Epic not found' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in epic details endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});



export default router; 