import { Router } from 'express';
import { updateConfluencePage } from '../../controllers/v1/confluenceController';

const router = Router();

/**
 * @swagger
 * /api/v1/confluence/update:
 *   post:
 *     summary: Update Confluence page
 *     description: Updates a Confluence page with analytics data.
 *     tags:
 *       - Confluence
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pageId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Confluence update result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Server error
 */
// POST /api/v1/confluence/update
router.post('/update', updateConfluencePage);

export default router; 