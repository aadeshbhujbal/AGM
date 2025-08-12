import { Router } from 'express';
import { runConfigOrchestration } from '../../services/configOrchestrationService';

const router = Router();

/**
 * @swagger
 * /api/v1/orchestration/run:
 *   get:
 *     summary: Run config-driven analytics orchestration
 *     description: Runs PI Planning, merge request, and velocity analytics for all projects in the config CSV.
 *     tags:
 *       - Orchestration
 *     responses:
 *       200:
 *         description: Orchestration results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   project:
 *                     type: string
 *                   piSummary:
 *                     type: object
 *                   mergeRequests:
 *                     type: object
 *                   velocity:
 *                     type: object
 *                   error:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/run', async (req, res) => {
  try {
    const results = await runConfigOrchestration();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router; 