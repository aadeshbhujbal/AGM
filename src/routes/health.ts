import { Router } from 'express';
import { healthCheck, statusCheck } from '../controllers/healthController';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check endpoint
 *     description: Returns basic service health status without external service checks.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: Node Microservice
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
router.get('/', healthCheck);

/**
 * @swagger
 * /api/health/test-connection:
 *   get:
 *     summary: Test connection to all external services
 *     description: Attempts to connect to Jira, Confluence, and GitLab, returning their connection status and error details if any.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Connection status for all services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 jira:
 *                   type: string
 *                   example: ok
 *                 confluence:
 *                   type: string
 *                   example: ok
 *                 gitlab:
 *                   type: string
 *                   example: ok
 *                 system:
 *                   type: object
 *                   properties:
 *                     uptimeSeconds:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     nodeVersion:
 *                       type: string
 *                     platform:
 *                       type: string
 *                     arch:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/test-connection', statusCheck);

export default router; 