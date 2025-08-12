// Core options and configuration interfaces
export interface MergeRequestsHeatmapOptions {
  groupId: string;
  startDate: string;
  endDate: string;
}

// User statistics and contribution interfaces
export interface UserMergeRequestStats {
  username: string;
  name: string;
  commits: number;
  mergeRequests: number;
  approvals: number;
  comments: number;
  lastActiveDate?: string;
  contributionScore?: number;
}

export interface PushDetail {
  sha: string;
  message: string;
  date: string;
  project: string;
  branch?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

// Date and contribution tracking types
export type DateString = string;
export type ContributionRecord = Record<string, number>;
export type DailyContributions = Record<DateString, ContributionRecord>;

// Merge request detail interfaces
export interface MergeRequestDetail {
  id: string;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  author: string;
  assignee?: string;
  reviewers: string[];
  labels: string[];
  branch: string;
  target_branch: string;
  approval_duration?: number;
  review_time?: number;
  size?: number;
  complexity?: number;
}

// Team metrics and analytics interfaces
export interface TeamMetrics {
  averageReviewTime: number;
  mergeSuccessRate: number;
  reviewParticipation: number;
  codeChurnRate: number;
}

export interface ContributionTrends {
  daily: Record<DateString, number>;
  weekly: Record<DateString, number>;
  monthly: Record<DateString, number>;
}

// Main result interfaces
export interface MergeRequestsHeatmapResult {
  users: UserMergeRequestStats[];
  totalMergeRequests: number;
  totalCommits: number;
  totalApprovals: number;
  totalComments: number;
  dailyContributions: DailyContributions;
  userPushDetails: Record<string, PushDetail[]>;
  contributionTrends: ContributionTrends;
  teamMetrics: TeamMetrics;
}

// GitLab API response interfaces
export interface GitLabProjectResponse {
  id: number;
  name: string;
  default_branch: string;
  path_with_namespace: string;
  description?: string;
  web_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GitLabGroupMemberResponse {
  id: number;
  username: string;
  name: string;
  access_level: number;
  state?: string;
  avatar_url?: string;
}

export interface GitLabMergeRequestResponse {
  id: number;
  iid: number;
  title: string;
  state: 'opened' | 'closed' | 'merged' | 'locked';
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  author: {
    id: number;
    username: string;
    name: string;
    avatar_url?: string;
  };
  assignee?: {
    id: number;
    username: string;
    name: string;
    avatar_url?: string;
  };
  source_branch: string;
  target_branch: string;
  description?: string;
  web_url?: string;
}

export interface GitLabCommitStats {
  additions: number;
  deletions: number;
  total: number;
}

export interface GitLabCommitResponse {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  created_at: string;
  stats?: GitLabCommitStats;
  ref?: string;
  web_url?: string;
  parent_ids?: string[];
}

export interface GitLabMRDetails {
  changes_count?: number;
  reviewers?: Array<{ 
    username: string;
    name?: string;
    id?: number;
  }>;
  labels?: string[];
  merged_at?: string;
  merge_commit_sha?: string;
  squash_commit_sha?: string;
  diff_refs?: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
}

export interface GitLabNoteResponse {
  id: number;
  body: string;
  author: {
    id: number;
    username: string;
    name: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at?: string;
  system: boolean;
  noteable_type?: string;
  noteable_id?: number;
  resolvable?: boolean;
  resolved?: boolean;
}

export interface GitLabApprovalResponse {
  approved_by: Array<{
    user: {
      id: number;
      username: string;
      name: string;
      avatar_url?: string;
    };
    created_at?: string;
  }>;
  approvals_required?: number;
  approvals_left?: number;
  approved?: boolean;
}

export interface GitLabUserResponse {
  id: number;
  username: string;
  name: string;
  email?: string;
  avatar_url?: string;
  state?: string;
  created_at?: string;
  is_admin?: boolean;
}

// Enums for merge request status
export enum MergeRequestStatus {
  Opened = 'opened',
  Closed = 'closed',
  Merged = 'merged',
  Locked = 'locked',
}

// Analytics interfaces
export interface MergeRequestAnalytics {
  id: number;
  status: MergeRequestStatus;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  project: string;
  approval_duration: number | null;
  last_commit_to_merge: number | null;
}

// Connection and utility interfaces
export interface GitLabConnectionTestResult {
  status: 'success' | 'error';
  message: string;
  user?: {
    username: string;
    name: string;
    id: number;
  };
}

// Error handling interfaces
export interface GitLabApiError {
  message: string;
  status?: number;
  error?: string;
  error_description?: string;
}

// Pagination interfaces for GitLab API responses
export interface GitLabPaginationOptions {
  page?: number;
  perPage?: number;
  orderBy?: string;
  sort?: 'asc' | 'desc';
}

export interface GitLabPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    nextPage?: number;
    prevPage?: number;
  };
}

// Filter and search interfaces
export interface MergeRequestFilters {
  state?: MergeRequestStatus;
  author?: string;
  assignee?: string;
  reviewer?: string;
  labels?: string[];
  milestone?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export interface CommitFilters {
  since?: string;
  until?: string;
  path?: string;
  author?: string;
  refName?: string;
}

// Configuration interfaces
export interface GitLabConfig {
  token: string;
  host: string;
  timeout?: number;
  retries?: number;
}

// Metrics calculation interfaces
export interface MetricsCalculationOptions {
  includeWeekends?: boolean;
  excludeBots?: boolean;
  minimumCommentLength?: number;
  contributionWeights?: {
    commits: number;
    mergeRequests: number;
    approvals: number;
    comments: number;
  };
}

// Export interfaces for CSV and reporting
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders?: boolean;
  dateFormat?: string;
  fields?: string[];
}

export interface ReportData {
  users: UserMergeRequestStats[];
  summary: {
    totalUsers: number;
    totalMergeRequests: number;
    totalCommits: number;
    totalApprovals: number;
    totalComments: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  teamMetrics: TeamMetrics;
  trends: ContributionTrends;
}

// Utility type for safe string conversion
export type SafeString<T> = T extends string ? T : string;

// Union types for common GitLab states
export type GitLabMergeRequestState = 'opened' | 'closed' | 'merged' | 'locked';
export type GitLabUserState = 'active' | 'blocked' | 'deactivated';
export type GitLabProjectVisibility = 'private' | 'internal' | 'public';

// Type guards for runtime type checking
export interface TypeGuards {
  isValidMergeRequestState(state: unknown): state is GitLabMergeRequestState;
  isValidDateString(date: unknown): date is string;
  isValidUserStats(stats: unknown): stats is UserMergeRequestStats;
}
