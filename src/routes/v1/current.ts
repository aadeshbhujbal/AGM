import { Router } from 'express';
import { getCurrentSummary } from '../../controllers/v1/currentController';

const router = Router();

/**
 * @swagger
 * /api/v1/current/summary:
 *   get:
 *     summary: Get unified current summary for Jira, PI Planning, Velocity, and Sprint Objectives
 *     description: Returns the current Jira sprint, current Jira release, current PI Planning sprints, current velocity sprint, and current sprint objectives in a unified response.
 *     tags:
 *       - Current
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
 *         description: Unified current summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jira:
 *                   type: object
 *                   properties:
 *                     currentRelease:
 *                       type: object
 *                       nullable: true
 *                     currentSprint:
 *                       type: object
 *                       nullable: true
 *                 piPlanning:
 *                   type: object
 *                   properties:
 *                     currentSprints:
 *                       type: array
 *                       items:
 *                         type: object
 *                     currentPI:
 *                       type: object
 *                       nullable: true
 *                 velocity:
 *                   type: object
 *                   properties:
 *                     currentSprint:
 *                       type: object
 *                       nullable: true
 *                     latestSprintEfficiency:
 *                       type: number
 *                 sprintObjectives:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     completedStoryPoints:
 *                       type: number
 *                     inProgressStoryPoints:
 *                       type: number
 *                     toDoStoryPoints:
 *                       type: number
 *                     objectives:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issueKey:
 *                             type: string
 *                           issueUrl:
 *                             type: string
 *                           description:
 *                             type: string
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */

router.get('/summary', getCurrentSummary);

export default router; 