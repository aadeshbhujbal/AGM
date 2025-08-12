export interface EpicData {
  epicKey: string;
  epicSummary: string;
  epicUrl: string;
  storyPoints: {
    original: number;
    added: number;
    completed: number;
    total: number;
  };
  piObjective: string;
  piProgressUpdate: string;
  raid: {
    risks: string[];
    assumptions: string[];
    issues: string[];
    dependencies: string[];
  };
  status: string;
  assignee?: string;
  created?: string;
  updated?: string;
}

export interface EpicTableRow {
  epic: string;
  piObjective: string;
  piProgressUpdate: string;
  raid: string;
  storyPoints: string; // Formatted like "(OSP (+4SP)/4SP / 2SP)"
}

export interface EpicSummaryOptions {
  projectKey: string;
  boardId: string;
  piStartDate?: string;
  piEndDate?: string;
  sprintIds?: number[];
} 