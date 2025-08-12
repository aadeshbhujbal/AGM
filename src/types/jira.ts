export enum JiraIssueStatusCategory {
  ToDo = 'todo',
  InProgress = 'indeterminate',
  Done = 'done',
}

export enum JiraSprintState {
  Active = 'active',
  Closed = 'closed',
  Future = 'future',
}

export type RagStatus = 'Red' | 'Amber' | 'Green';

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  startDate?: string;
  releaseDate?: string;
  released?: boolean;
  overdue?: boolean;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: JiraSprintState;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
}


export interface JiraIssueFields {
  summary?: string;
  status?: {
    name?: string;
    statusCategory?: {
      key?: JiraIssueStatusCategory;
    };
  };
  customfield_10002?: number; // Story Points
  parent?: { id: string; key: string };
  assignee?: { accountId: string; displayName: string };
  created?: string;
  updated?: string;
  customfield_10341?: Array<{ id: number; name: string }>; // Sprint
  customfield_30160?: string; // RAID
  customfield_42105?: string; // WSJF
  customfield_20046?: string; // PI Scope
  customfield_30195?: string; // Progress
  issuetype?: { id: string; name: string };
  project?: { id: string; key: string; name: string };
  fixVersions?: JiraVersion[];
  components?: { id: string; name: string }[];
  priority?: { id: string; name: string };
  labels?: string[];
  description?: string;
  resolution?: { id: string; name: string };
  resolutiondate?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

export interface JiraEpic {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

// New types for API responses
export interface JiraSprintResponse {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  goal?: string;
  originBoardId: number;
  completeDate?: string;
}

export interface JiraVelocityStats {
  velocityStatEntries: Record<string, {
    estimated: { value: number };
    completed: { value: number };
  }>;
  sprints: JiraSprint[];
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraSprintListResponse {
  values: JiraSprintResponse[];
  isLast: boolean;
  maxResults: number;
  startAt: number;
} 
