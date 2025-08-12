import { MilestoneData, MilestoneSummaryOptions, PIProgressionData, MilestoneStatus, TrackStatus } from '../types/milestone';
import { JiraVersion, JiraIssue } from '../types/jira';
import { getReleasesFromJira, getIssuesFromJira } from './jiraService';
import { calculateStoryPointBreakdown } from '../utils/storyPointUtils';
import config from '../config';

export async function getMilestones(options: MilestoneSummaryOptions): Promise<MilestoneData[]> {
  const { projectKey, status, track, startDate, endDate } = options;

  try {
    // Get releases from Jira (these are our milestones)
    const jiraReleases = await getReleasesFromJira(projectKey);
    const milestones: MilestoneData[] = [];

    for (const release of jiraReleases) {
      // Filter by status if specified
      if (status && status.length > 0) {
        const releaseStatus = release.released ? MilestoneStatus.Released : MilestoneStatus.Unreleased;
        if (!status.includes(releaseStatus)) {
          continue;
        }
      }

      // Filter by date range if specified
      if (startDate && endDate && release.releaseDate) {
        const releaseDate = new Date(release.releaseDate);
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (releaseDate < startDateObj || releaseDate > endDateObj) {
          continue;
        }
      }

      // Determine track status based on release date and overdue status
      const trackStatus = determineTrackStatus(release);

      const milestone: MilestoneData = {
        version: release.name,
        startDate: null, // Jira releases don't have start dates, only release dates
        endDate: release.releaseDate || '',
        status: release.released ? MilestoneStatus.Released : MilestoneStatus.Unreleased,
        track: trackStatus,
        description: release.name,
        projectKey
      };

      // Filter by track status if specified
      if (track && track.length > 0) {
        if (track.includes(trackStatus)) {
          milestones.push(milestone);
        }
      } else {
        milestones.push(milestone);
      }
    }

    // Sort by end date (most recent first)
    const chronologicallySortedMilestones = milestones.sort((firstMilestone, secondMilestone) => {
      const firstMilestoneDate = firstMilestone.endDate ? new Date(firstMilestone.endDate).getTime() : 0;
      const secondMilestoneDate = secondMilestone.endDate ? new Date(secondMilestone.endDate).getTime() : 0;
      return secondMilestoneDate - firstMilestoneDate;
    });

    return chronologicallySortedMilestones;
  } catch (error) {
    console.error('Error fetching milestones:', error);
    throw error;
  }
}

export async function getPIProgression(projectKey: string, boardId: string, piStartDate?: string, piEndDate?: string): Promise<PIProgressionData> {
  try {
    // Build JQL query to get issues for the PI
    let jql = `project = "${projectKey}" AND issuetype in (Story, Bug, "User Story", Task)`;
    
    if (piStartDate && piEndDate) {
      jql += ` AND (created >= "${piStartDate}" OR updated >= "${piStartDate}")`;
    }

    const issues = await getIssuesFromJira(jql);
    const breakdown = calculateStoryPointBreakdown(issues);

    // For now, we'll use a default team name "SOS" as shown in the image
    // In a real implementation, you might want to get team information from a different source
    const teamName = 'SOS';

    return {
      totalStoryPoints: breakdown.total,
      statusBreakdown: {
        completed: breakdown.completed,
        inProgress: breakdown.inProgress,
        toDo: breakdown.toDo
      },
      teamBreakdown: {
        teamName,
        totalStoryPoints: breakdown.total,
        completed: breakdown.completed,
        inProgress: breakdown.inProgress,
        toDo: breakdown.toDo
      }
    };
  } catch (error) {
    console.error('Error calculating PI progression:', error);
    throw error;
  }
}

// Sprint objectives moved to sprint service - not appropriate for milestone service

function determineTrackStatus(release: JiraVersion): TrackStatus {
  if (!release.releaseDate) {
    return TrackStatus.Planned;
  }

  const releaseDate = new Date(release.releaseDate);
  const currentDate = new Date();
  const daysUntilRelease = Math.ceil((releaseDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  if (release.released) {
    return TrackStatus.OnTrack;
  }

  if (release.overdue) {
    return TrackStatus.OffTrack;
  }

  if (daysUntilRelease <= 7) {
    return TrackStatus.AtRisk;
  }

  if (daysUntilRelease <= 14) {
    return TrackStatus.AtRisk;
  }

  return TrackStatus.OnTrack;
} 