import { Request, Response } from 'express';
import { piPlanningSummaryService } from '../../services/piPlanningService';

export const piPlanningSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { project, boardId, piStartDate, piEndDate } = req.query;
    // TODO: Validate and pass all needed params
    const summary = await piPlanningSummaryService({
      project: project as string,
      boardId: boardId as string,
      piStartDate: piStartDate as string,
      piEndDate: piEndDate as string,
      // Add more params as needed
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PI Planning summary', details: (error as Error).message });
  }
}; 