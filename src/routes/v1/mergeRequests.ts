import { Router } from 'express';
import { getMergeRequestsHeatmap, getMergeRequestsAnalytics } from '../../services/mergeRequestsService';
import { exportMergeRequestsCsv } from '../../controllers/v1/mergeRequestsExportController';

const router = Router();

/**
 * @swagger
 * /api/v1/merge-requests/heatmap:
 *   get:
 *     summary: Get merge request analytics heatmap
 *     description: Returns per-user merge request, commit, approval, and comment stats for a GitLab group and date range.
 *     tags:
 *       - Merge Requests
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: GitLab group ID or path
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       commits:
 *                         type: integer
 *                       mergeRequests:
 *                         type: integer
 *                       approvals:
 *                         type: integer
 *                       comments:
 *                         type: integer
 *                 totalMergeRequests:
 *                   type: integer
 *                 totalCommits:
 *                   type: integer
 *                 totalApprovals:
 *                   type: integer
 *                 totalComments:
 *                   type: integer
 *       400:
 *         description: Missing required query params
 *       500:
 *         description: Server error
 */
router.get('/heatmap', async (req, res) => {
  try {
    // Accept groupId, startDate, endDate as query params
    const { groupId, startDate, endDate } = req.query;
    if (!groupId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required query params: groupId, startDate, endDate' });
    }
    const result = await getMergeRequestsHeatmap({
      groupId: groupId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/v1/merge-requests/analytics:
 *   get:
 *     summary: Get per-merge-request analytics
 *     description: Returns analytics for each merge request (author, status, project, etc.) for a GitLab group and date range.
 *     tags:
 *       - Merge Requests
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: GitLab group ID or path
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Merge request analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                   updated_at:
 *                     type: string
 *                   project:
 *                     type: string
 *                   approval_duration:
 *                     type: number
 *                   last_commit_to_merge:
 *                     type: number
 *     400:
 *       description: Missing required query params
 *     500:
 *       description: Server error
 */
router.get('/analytics', async (req, res) => {
  try {
    const { groupId, startDate, endDate } = req.query;
    if (!groupId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required query params: groupId, startDate, endDate' });
    }
    const result = await getMergeRequestsAnalytics({
      groupId: groupId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/export-csv', exportMergeRequestsCsv);

export default router; 