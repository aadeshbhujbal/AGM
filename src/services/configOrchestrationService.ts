import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { piPlanningSummaryService } from './piPlanningService';
import { getMergeRequestsHeatmap } from './mergeRequestsService';
import { getVelocitySummary } from './velocityService';
// import { piPlanningSummaryService } from './piPlanningService';
// import { getMergeRequestsHeatmap } from './mergeRequestsService';
// import { getVelocitySummary } from './velocityService';

export interface SosConfigRow {
  Project: string;
  ConfluencePageName: string;
  ConfluencePageID: string;
  PortfolioJIRAProjectID: string;
  PIStartDate: string;
  PIEndDate: string;
  IncludedSprintName: string;
  ExcludedSprintName: string;
  CodePageUrl: string;
  DodPageUrl: string;
  CodePageTitle: string;
  DodPageTitle: string;
  JiraBoardId: string;
  GitlabDashboardUrl: string;
  JiraTeamName: string;
  SprintFilter: string;
}

export interface OrchestrationResult {
  project: string;
  piSummary?: any;
  mergeRequests?: any;
  velocity?: any;
  error?: string;
  // Add more as needed
}

export async function runConfigOrchestration(): Promise<OrchestrationResult[]> {
  const csvPath = path.resolve(__dirname, './sos_config_5.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: SosConfigRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: '|',
  });

  const results: OrchestrationResult[] = [];
  for (const row of records) {
    try {
      const [piSummary, mergeRequests, velocity] = await Promise.all([
        piPlanningSummaryService({
          project: row.Project,
          boardId: row.JiraBoardId,
          piStartDate: row.PIStartDate,
          piEndDate: row.PIEndDate,
        }),
        getMergeRequestsHeatmap({
          groupId: row.GitlabDashboardUrl,
          startDate: row.PIStartDate,
          endDate: row.PIEndDate,
        }),
        getVelocitySummary({
          boardId: row.JiraBoardId,
          numSprints: 6,
          year: row.PIStartDate ? new Date(row.PIStartDate).getFullYear() : undefined,
          sprintPrefix: row.IncludedSprintName || undefined,
        }),
      ]);
      results.push({
        project: row.Project,
        piSummary,
        mergeRequests,
        velocity,
      });
    } catch (err) {
      results.push({
        project: row.Project,
        error: (err as Error).message,
      });
    }
  }
  return results;
} 