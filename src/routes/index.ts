import { Router } from 'express';
import confluenceRoutes from './v1/confluence';
import mergeRequestsRoutes from './v1/mergeRequests';
import velocityRoutes from './v1/velocity';
import piPlanningRoutes from './v1/piPlanning';
import milestoneRoutes from './v1/milestone';
import epicRoutes from './v1/epic';
import jiraRoutes from './v1/jira';
import currentRoutes from './v1/current';
import orchestrationRoutes from './v1/orchestration';




const router = Router();

router.use('/api/v1/confluence', confluenceRoutes);
router.use('/api/v1/merge-requests', mergeRequestsRoutes);
router.use('/api/v1/pi-planning', piPlanningRoutes);
router.use('/api/v1/velocity', velocityRoutes);
router.use('/api/v1/epic', epicRoutes);
router.use('/api/v1/current', currentRoutes);
router.use('/api/v1/jira', jiraRoutes);
router.use('/api/v1/orchestration', orchestrationRoutes);
router.use('/api/v1/milestone', milestoneRoutes);

export default router; 