export interface MilestoneData {
  version: string;
  startDate: string | null;
  endDate: string;
  status: MilestoneStatus;
  track: TrackStatus;
  description?: string;
  projectKey?: string;
}

export enum MilestoneStatus {
  Released = 'RELEASED',
  Unreleased = 'UNRELEASED',
  InProgress = 'IN_PROGRESS',
  Planned = 'PLANNED'
}

export enum TrackStatus {
  OnTrack = 'ON_TRACK',
  OffTrack = 'OFF_TRACK',
  AtRisk = 'AT_RISK',
  Delayed = 'DELAYED',
  Planned = 'PLANNED'
}

export interface MilestoneSummaryOptions {
  projectKey: string;
  status?: MilestoneStatus[];
  track?: TrackStatus[];
  startDate?: string;
  endDate?: string;
}

export interface PIProgressionData {
  totalStoryPoints: number;
  statusBreakdown: {
    completed: number;
    inProgress: number;
    toDo: number;
  };
  teamBreakdown: {
    teamName: string;
    totalStoryPoints: number;
    completed: number;
    inProgress: number;
    toDo: number;
  };
} 