import { Request, Response } from 'express';
// @ts-ignore
import { Parser } from 'json2csv';

/**
 * @swagger
 * /api/v1/merge-requests/export:
 *   post:
 *     summary: Export merge requests data to CSV
 *     description: Converts provided merge requests data array to CSV format
 *     tags:
 *       - Merge Requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: CSV file containing merge requests data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Missing or invalid data array in request body
 *       500:
 *         description: Server error while generating CSV
 */
export const exportMergeRequestsCsv = async (req: Request, res: Response): Promise<void> => {
  const data = req.body.data;
  if (!Array.isArray(data) || data.length === 0) {
    res.status(400).json({ error: 'Missing or invalid data array in request body.' });
    return;
  }

  try {
    const parser = new Parser();
    const csv = parser.parse(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="merge_requests.csv"');
    res.send(csv);
  } catch (err: any) {
    console.error('Error exporting merge requests to CSV:', err);
    res.status(500).json({ error: err.message });
  }
}; 