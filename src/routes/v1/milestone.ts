import { Router } from 'express';
import { getMilestones, getPIProgression } from '../../services/milestoneService';
import { MilestoneStatus, TrackStatus } from '../../types/milestone';
import { createServiceError, ServiceError } from '../../types/errors';

const router = Router();

/**
 * @swagger
 * /api/v1/milestone/list:
 *   get:
 *     summary: Get milestones (releases) for a project
 *     description: Returns milestone data including version, dates, status, and track information.
 *     tags:
 *       - Milestone
 *     parameters:
 *       - in: query
 *         name: projectKey
 *         schema:
 *           type: string
 *         required: true
 *         description: Jira project key
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of statuses (RELEASED,UNRELEASED,IN_PROGRESS,PLANNED)
 *       - in: query
 *         name: track
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of track statuses (ON_TRACK,OFF_TRACK,AT_RISK,DELAYED,PLANNED)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Milestone data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   version:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     nullable: true
 *                   endDate:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [RELEASED, UNRELEASED, IN_PROGRESS, PLANNED]
 *                   track:
 *                     type: string
 *                     enum: [ON_TRACK, OFF_TRACK, AT_RISK, DELAYED, PLANNED]
 *                   description:
 *                     type: string
 *                   projectKey:
 *                     type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/list', async (req, res) => {
  try {
    const { projectKey, status, track, startDate, endDate } = req.query;
    
    if (!projectKey) {
      return res.status(400).json({ error: 'Missing required parameter: projectKey' });
    }

      const statusArray = status ? (status as string).split(',').map(statusItem => statusItem.trim() as MilestoneStatus) : undefined;
  const trackArray = track ? (track as string).split(',').map(trackItem => trackItem.trim() as TrackStatus) : undefined;

    const result = await getMilestones({
      projectKey: projectKey as string,
      status: statusArray,
      track: trackArray,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(result);
  } catch (err) {
    console.error('Error in milestone list endpoint:', err);
    if (err instanceof Error) {
      const serviceError = createServiceError(err.message, 'Milestone Service', 'getMilestones');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    } else {
      const serviceError = createServiceError('Unknown error occurred', 'Milestone Service', 'getMilestones');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    }
  }
});

/**
 * @swagger
 * /api/v1/milestone/pi-progression:
 *   get:
 *     summary: Get PI progression data with story points breakdown
 *     description: Returns PI progression data including total story points and breakdown by status and team.
 *     tags:
 *       - Milestone
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
 *     responses:
 *       200:
 *         description: PI progression data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStoryPoints:
 *                   type: number
 *                 statusBreakdown:
 *                   type: object
 *                   properties:
 *                     completed:
 *                       type: number
 *                     inProgress:
 *                       type: number
 *                     toDo:
 *                       type: number
 *                 teamBreakdown:
 *                   type: object
 *                   properties:
 *                     teamName:
 *                       type: string
 *                     totalStoryPoints:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     inProgress:
 *                       type: number
 *                     toDo:
 *                       type: number
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/pi-progression', async (req, res) => {
  try {
    const { projectKey, boardId, piStartDate, piEndDate } = req.query;
    
    if (!projectKey || !boardId) {
      return res.status(400).json({ error: 'Missing required parameters: projectKey and boardId' });
    }

    const result = await getPIProgression(
      projectKey as string,
      boardId as string,
      piStartDate as string,
      piEndDate as string
    );

    res.json(result);
  } catch (err) {
    console.error('Error in PI progression endpoint:', err);
    if (err instanceof Error) {
      const serviceError = createServiceError(err.message, 'Milestone Service', 'getPIProgression');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    } else {
      const serviceError = createServiceError('Unknown error occurred', 'Milestone Service', 'getPIProgression');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    }
  }
});

// Sprint objectives endpoint moved to /api/v1/sprint/objectives - not appropriate for milestone API

export default router; 