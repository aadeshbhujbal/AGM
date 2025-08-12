import { JiraVersion, JiraSprint, JiraIssue, RagStatus } from './jira';

export interface PiPlanningSummaryOptions {
  project: string;
  boardId: string;
  piStartDate: string;
  piEndDate: string;
}

export interface EpicAdvancedAnalytics {
  raid?: string;
  wsjf?: string;
  piScope?: string;
  progress?: string;
}

export interface StoryPointsBreakdown {
  completed: number;
  inProgress: number;
  toDo: number;
  total: number;
}

export interface EpicProgressSummary extends StoryPointsBreakdown {
  completedPct: number;
  rag: RagStatus;
  raid?: string;
  wsjf?: string;
  piScope?: string;
  progress?: string;
}

export interface SprintGroupStats {
  groupTotal: number;
  groupCompleted: number;
  groupInProgress: number;
  groupToDo: number;
}

export interface BurnupDataPoint {
  date: string;
  completed: number;
}

export interface PiPlanningSummaryResult {
  releases: JiraVersion[];
  sprints: JiraSprint[];
  issues: JiraIssue[];
  storyPoints: number;
  completedStoryPoints: number;
  inProgressStoryPoints: number;
  toDoStoryPoints: number;
  completedPercentage: number;
  ragStatus: RagStatus;
  epicBreakdown: Record<string, StoryPointsBreakdown>;
  sprintBreakdown: Record<string, StoryPointsBreakdown>;
  currentSprints: JiraSprint[];
  previousSprints: JiraSprint[];
  futureSprints: JiraSprint[];
  currentSprintStats: SprintGroupStats;
  previousSprintStats: SprintGroupStats;
  futureSprintStats: SprintGroupStats;
  burnup: BurnupDataPoint[];
  storyPointsCurrent: number;
  epicProgress: Record<string, EpicProgressSummary>;
  raid: Record<string, string>;
  wsjf: Record<string, string>;
  piScope: Record<string, string>;
  progress: Record<string, string>;
}
