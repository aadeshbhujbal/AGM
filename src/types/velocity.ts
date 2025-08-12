export interface VelocitySummaryOptions {
  boardId: string;
  numSprints?: number;
  year?: number;
  sprintPrefix?: string;
}

export interface SprintVelocity {
  sprintId: number;
  sprintName: string;
  startDate: string;
  endDate: string;
  committed: number;
  completed: number;
  teamMembers: number;
  addedStoryPoints: number;
  efficiency: number;
  allottedStoryPoints: number;
  optimalStoryPoints: number;
  efficiencyBasedOnAllotted: number;
  spillover: number;
}

export interface VelocitySummaryResult {
  sprints: SprintVelocity[];
  boardId: string;
  summary: string;
  latestSprintEfficiency: number;
}

export interface VelocityCalculationResult {
  committed: number;
  completed: number;
  efficiency: number;
  spillover: number;
  teamMembersCount: number;
}
