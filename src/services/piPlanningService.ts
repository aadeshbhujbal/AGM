import { getReleasesFromJira, getSprintsFromJira, getIssuesFromJira } from './jiraService';
import { 
  PiPlanningSummaryOptions, 
  EpicAdvancedAnalytics,
  StoryPointsBreakdown,
  EpicProgressSummary,
  SprintGroupStats,
  BurnupDataPoint,
  PiPlanningSummaryResult
} from '../types/piPlanning';
import { JiraIssueStatusCategory, JiraSprintState, JiraIssue, JiraSprint, RagStatus, JiraVersion } from '../types/jira';

function processStoryPointsValue(storyPointsInput: number | string | undefined | null): number {
  if (typeof storyPointsInput === 'number') {
    return Number.isInteger(storyPointsInput) ? storyPointsInput : Math.round(storyPointsInput);
  }
  if (typeof storyPointsInput === 'string') {
    const parsedStoryPoints = parseFloat(storyPointsInput);
    return isNaN(parsedStoryPoints) ? 0 : Math.round(parsedStoryPoints);
  }
  return 0;
}

function parseJiraDateString(dateString?: string): Date | null {
  if (!dateString) return null;
  // Jira dates are usually ISO 8601
  return new Date(dateString);
}

function calculateEpicRagStatus(completedStoryPoints: number, totalStoryPoints: number): RagStatus {
  if (totalStoryPoints === 0) return 'Red';
  const completionPercentage = (completedStoryPoints / totalStoryPoints) * 100;
  if (completionPercentage > 90) return 'Green';
  if (completionPercentage >= 80) return 'Amber';
  return 'Red';
}

function createEmptyPiPlanningSummary(projectReleases: JiraVersion[]): PiPlanningSummaryResult {
  return {
    releases: projectReleases,
    sprints: [],
    issues: [],
    storyPoints: 0,
    completedStoryPoints: 0,
    inProgressStoryPoints: 0,
    toDoStoryPoints: 0,
    completedPercentage: 0,
    ragStatus: 'Red',
    epicBreakdown: {},
    sprintBreakdown: {},
    currentSprints: [],
    previousSprints: [],
    futureSprints: [],
    currentSprintStats: { groupTotal: 0, groupCompleted: 0, groupInProgress: 0, groupToDo: 0 },
    previousSprintStats: { groupTotal: 0, groupCompleted: 0, groupInProgress: 0, groupToDo: 0 },
    futureSprintStats: { groupTotal: 0, groupCompleted: 0, groupInProgress: 0, groupToDo: 0 },
    burnup: [],
    storyPointsCurrent: 0,
    epicProgress: {},
    raid: {},
    wsjf: {},
    piScope: {},
    progress: {}
  };
}
export async function piPlanningSummaryService(piPlanningOptions: PiPlanningSummaryOptions): Promise<PiPlanningSummaryResult> {
  const { project, boardId, piStartDate, piEndDate } = piPlanningOptions;

  // 1. Fetch releases for the project
  const projectReleases = await getReleasesFromJira(project);

  // 2. Fetch sprints for the board
  const allBoardSprints = await getSprintsFromJira(boardId);

  // 3. Filter sprints by PI date range (if dates are provided)
  const sprintsWithinPiDateRange = allBoardSprints.filter(currentSprint => {
    if (!currentSprint.startDate || !currentSprint.endDate) return false;
    const sprintStartDate = new Date(currentSprint.startDate);
    const sprintEndDate = new Date(currentSprint.endDate);
    const piStartDateParsed = new Date(piStartDate);
    const piEndDateParsed = new Date(piEndDate);
    
    // Include sprints that overlap with the PI period
    return (sprintStartDate <= piEndDateParsed && sprintEndDate >= piStartDateParsed);
  });

  // Check if we have any sprints in the PI date range
  if (sprintsWithinPiDateRange.length === 0) {
    return createEmptyPiPlanningSummary(projectReleases);
  }

  // 4. Fetch issues for the project and filtered sprints
  const sprintIdsWithinPiRange = sprintsWithinPiDateRange.map(sprint => sprint.id);
  const sprintFilterClause = sprintIdsWithinPiRange.length > 0 
    ? `OR Sprint in (${sprintIdsWithinPiRange.join(',')})` 
    : '';
  
  const issueSearchJqlQuery = `project = "${project}" 
    AND issuetype in (Story, Bug, "User Story", Task) 
    AND (
      (created >= "${piStartDate}" AND created <= "${piEndDate}")
      OR (updated >= "${piStartDate}" AND updated <= "${piEndDate}")
      OR (resolutiondate >= "${piStartDate}" AND resolutiondate <= "${piEndDate}")
      ${sprintFilterClause}
    )`;
  
  console.log('JQL Query:', issueSearchJqlQuery); // For debugging
  const issuesMatchingCriteria = await getIssuesFromJira(issueSearchJqlQuery);

  // 5. Calculate story points and group by status
  let totalStoryPointsInPi = 0;
  let completedStoryPointsInPi = 0;
  let inProgressStoryPointsInPi = 0;
  let toDoStoryPointsInPi = 0;
  
  const completedStatusNames = ['Done', 'Closed', 'Resolved'];
  const inProgressStatusNames = ['In Progress', 'In Development'];
  const toDoStatusNames = ['To Do', 'Open', 'New'];

  // Epic and sprint breakdowns
  const epicStoryPointsBreakdown: Record<string, StoryPointsBreakdown> = {};
  const sprintStoryPointsBreakdown: Record<string, StoryPointsBreakdown> = {};

  for (const currentIssue of issuesMatchingCriteria) {
    const issueStoryPoints = processStoryPointsValue(currentIssue.fields['customfield_10002']);
    totalStoryPointsInPi += issueStoryPoints;
    
    const issueStatusName = (currentIssue.fields.status?.name || '').toLowerCase();
    const parentEpicKey = currentIssue.fields.parent?.key || 'No Epic';
    
    let issueSprintHistory: Array<{ id: number; name: string }> = [];
    if (Array.isArray(currentIssue.fields.customfield_10341)) {
      issueSprintHistory = currentIssue.fields.customfield_10341;
    } else if (currentIssue.fields.customfield_10341 && typeof currentIssue.fields.customfield_10341 === 'object') {
      issueSprintHistory = [currentIssue.fields.customfield_10341];
    }
    
    // Use the latest sprint for grouping
    const currentSprintId = issueSprintHistory.length > 0 
      ? issueSprintHistory[issueSprintHistory.length - 1]?.id?.toString() 
      : 'No Sprint';

    // Initialize epic breakdown if not exists
    if (!epicStoryPointsBreakdown[parentEpicKey]) {
      epicStoryPointsBreakdown[parentEpicKey] = { completed: 0, inProgress: 0, toDo: 0, total: 0 };
    }
    epicStoryPointsBreakdown[parentEpicKey].total += issueStoryPoints;
    
    // Initialize sprint breakdown if not exists
    if (!sprintStoryPointsBreakdown[currentSprintId]) {
      sprintStoryPointsBreakdown[currentSprintId] = { completed: 0, inProgress: 0, toDo: 0, total: 0 };
    }
    sprintStoryPointsBreakdown[currentSprintId].total += issueStoryPoints;

    // Categorize by status
    if (completedStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
      completedStoryPointsInPi += issueStoryPoints;
      epicStoryPointsBreakdown[parentEpicKey].completed += issueStoryPoints;
      sprintStoryPointsBreakdown[currentSprintId].completed += issueStoryPoints;
    } else if (inProgressStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
      inProgressStoryPointsInPi += issueStoryPoints;
      epicStoryPointsBreakdown[parentEpicKey].inProgress += issueStoryPoints;
      sprintStoryPointsBreakdown[currentSprintId].inProgress += issueStoryPoints;
    } else if (toDoStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
      toDoStoryPointsInPi += issueStoryPoints;
      epicStoryPointsBreakdown[parentEpicKey].toDo += issueStoryPoints;
      sprintStoryPointsBreakdown[currentSprintId].toDo += issueStoryPoints;
    }
  }

  // 6. Calculate RAG status
  let piRagStatus: RagStatus = 'Red';
  let piCompletionPercentage = 0;
  if (totalStoryPointsInPi > 0) {
    piCompletionPercentage = Math.round((completedStoryPointsInPi / totalStoryPointsInPi) * 100);
    if (piCompletionPercentage > 90) {
      piRagStatus = 'Green';
    } else if (piCompletionPercentage >= 80) {
      piRagStatus = 'Amber';
    }
  }

    // 7. Identify current, previous, and future sprints
    const currentDate = new Date();
    const currentlyActiveSprints = sprintsWithinPiDateRange.filter(sprint => {
      const sprintStartDate = parseJiraDateString(sprint.startDate);
      const sprintEndDate = parseJiraDateString(sprint.endDate);
      return sprintStartDate && sprintEndDate && sprintStartDate <= currentDate && currentDate <= sprintEndDate;
    });
    
    const previouslyCompletedSprints = sprintsWithinPiDateRange.filter(sprint => {
      const sprintEndDate = parseJiraDateString(sprint.endDate);
      return sprintEndDate && sprintEndDate < currentDate;
    });
    
    const upcomingFutureSprints = sprintsWithinPiDateRange.filter(sprint => {
      const sprintStartDate = parseJiraDateString(sprint.startDate);
      return sprintStartDate && sprintStartDate > currentDate;
    });
  
    // 8. Calculate stats for each sprint group
    function calculateSprintGroupStatistics(sprintGroup: JiraSprint[]): SprintGroupStats {
      const sprintIdSet = new Set(sprintGroup.map(sprint => sprint.id));
      let groupTotalStoryPoints = 0;
      let groupCompletedStoryPoints = 0;
      let groupInProgressStoryPoints = 0;
      let groupToDoStoryPoints = 0;
      
      for (const issue of issuesMatchingCriteria) {
        let issueSprintHistory: Array<{ id: number; name: string }> = [];
        if (Array.isArray(issue.fields.customfield_10341)) {
          issueSprintHistory = issue.fields.customfield_10341;
        } else if (issue.fields.customfield_10341 && typeof issue.fields.customfield_10341 === 'object') {
          issueSprintHistory = [issue.fields.customfield_10341];
        }
        
        const issueCurrentSprintId = issueSprintHistory.length > 0 
          ? issueSprintHistory[issueSprintHistory.length - 1]?.id 
          : null;
          
        if (issueCurrentSprintId && sprintIdSet.has(issueCurrentSprintId)) {
          const issueStoryPoints = processStoryPointsValue(issue.fields['customfield_10002']);
          const issueStatusName = (issue.fields.status?.name || '').toLowerCase();
          
          groupTotalStoryPoints += issueStoryPoints;
          
          if (completedStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
            groupCompletedStoryPoints += issueStoryPoints;
          } else if (inProgressStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
            groupInProgressStoryPoints += issueStoryPoints;
          } else if (toDoStatusNames.map(status => status.toLowerCase()).includes(issueStatusName)) {
            groupToDoStoryPoints += issueStoryPoints;
          }
        }
      }
      
      return { 
        groupTotal: groupTotalStoryPoints, 
        groupCompleted: groupCompletedStoryPoints, 
        groupInProgress: groupInProgressStoryPoints, 
        groupToDo: groupToDoStoryPoints 
      };
    }
  
    const currentSprintStatistics = calculateSprintGroupStatistics(currentlyActiveSprints);
    const previousSprintStatistics = calculateSprintGroupStatistics(previouslyCompletedSprints);
    const futureSprintStatistics = calculateSprintGroupStatistics(upcomingFutureSprints);
  
    // 9. Calculate story points progress over time (burn-up)
    const burnupProgressData: BurnupDataPoint[] = [];
    let cumulativeCompletedStoryPoints = 0;
    const sprintsSortedByStartDate = [...sprintsWithinPiDateRange].sort((firstSprint, secondSprint) => 
      (firstSprint.startDate || '').localeCompare(secondSprint.startDate || '')
    );
    
    for (const sprint of sprintsSortedByStartDate) {
      const sprintId = sprint.id;
      const sprintCompletedStoryPoints = sprintStoryPointsBreakdown[sprintId]?.completed || 0;
      cumulativeCompletedStoryPoints += sprintCompletedStoryPoints;
      burnupProgressData.push({ 
        date: sprint.endDate || '', 
        completed: cumulativeCompletedStoryPoints 
      });
    }
  
    // 10. Calculate expected story points by now (story_points_current)
    let expectedStoryPointsByCurrentDate = 0;
    let totalPiDurationInDays = 0;
    let elapsedDaysInPi = 0;
    
    for (const sprint of sprintsSortedByStartDate) {
      const sprintStartDate = parseJiraDateString(sprint.startDate);
      const sprintEndDate = parseJiraDateString(sprint.endDate);
      if (!sprintStartDate || !sprintEndDate) continue;
      
      const sprintDurationInDays = Math.ceil((sprintEndDate.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24));
      totalPiDurationInDays += sprintDurationInDays;
      
      if (currentDate > sprintEndDate) {
        elapsedDaysInPi += sprintDurationInDays;
      } else if (currentDate >= sprintStartDate && currentDate <= sprintEndDate) {
        elapsedDaysInPi += Math.ceil((currentDate.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    
    if (totalPiDurationInDays > 0) {
      expectedStoryPointsByCurrentDate = Math.round((elapsedDaysInPi / totalPiDurationInDays) * totalStoryPointsInPi);
    }
  
  // 11. Advanced analytics: fetch RAID, WSJF, PI Scope, Progress for each epic
  const epicAdvancedAnalyticsData: Record<string, EpicAdvancedAnalytics> = {};
  const epicKeysForAnalysis = Object.keys(epicStoryPointsBreakdown).filter(epicKey => epicKey !== 'No Epic');
  
  if (epicKeysForAnalysis.length > 0) {
    try {
      const epicDetailsJqlQuery = `key in (${epicKeysForAnalysis.map(epicKey => `"${epicKey}"`).join(',')})`;
      const epicDetailsFromJira = await getIssuesFromJira(epicDetailsJqlQuery);
      
      for (const epicIssue of epicDetailsFromJira) {
        const epicKey = epicIssue.key;
        epicAdvancedAnalyticsData[epicKey] = {
          raid: epicIssue.fields['customfield_30160'] || '',
          wsjf: epicIssue.fields['customfield_42105'] || '',
          piScope: epicIssue.fields['customfield_20046'] || '',
          progress: epicIssue.fields['customfield_30195'] || '',
        };
      }
    } catch (error) {
      console.error('Error fetching epic details:', error);
    }
  }
  

  // 12. Epic progress summary
  const epicProgressSummaryData: Record<string, EpicProgressSummary> = {};
  for (const epicKey in epicStoryPointsBreakdown) {
    const epicBreakdown = epicStoryPointsBreakdown[epicKey];
    const epicCompletionPercentage = epicBreakdown.total > 0 
      ? Math.round((epicBreakdown.completed / epicBreakdown.total) * 100) 
      : 0;
      
    epicProgressSummaryData[epicKey] = {
      ...epicBreakdown,
      completedPct: epicCompletionPercentage,
      rag: calculateEpicRagStatus(epicBreakdown.completed, epicBreakdown.total),
      ...(epicAdvancedAnalyticsData[epicKey] || {}),
    };
  }

  // 13. Prepare RAID, WSJF, PI Scope, and Progress summaries
  const raidSummaryByEpic: Record<string, string> = {};
  const wsjfSummaryByEpic: Record<string, string> = {};
  const piScopeSummaryByEpic: Record<string, string> = {};
  const progressSummaryByEpic: Record<string, string> = {};

  for (const epicKey in epicAdvancedAnalyticsData) {
    const epicAnalyticsData = epicAdvancedAnalyticsData[epicKey];
    if (epicAnalyticsData.raid) raidSummaryByEpic[epicKey] = epicAnalyticsData.raid;
    if (epicAnalyticsData.wsjf) wsjfSummaryByEpic[epicKey] = epicAnalyticsData.wsjf;
    if (epicAnalyticsData.piScope) piScopeSummaryByEpic[epicKey] = epicAnalyticsData.piScope;
    if (epicAnalyticsData.progress) progressSummaryByEpic[epicKey] = epicAnalyticsData.progress;
  }

  return {
    releases: projectReleases,
    sprints: sprintsWithinPiDateRange,
    issues: issuesMatchingCriteria,
    storyPoints: totalStoryPointsInPi,
    completedStoryPoints: completedStoryPointsInPi,
    inProgressStoryPoints: inProgressStoryPointsInPi,
    toDoStoryPoints: toDoStoryPointsInPi,
    completedPercentage: piCompletionPercentage,
    ragStatus: piRagStatus,
    epicBreakdown: epicStoryPointsBreakdown,
    sprintBreakdown: sprintStoryPointsBreakdown,
    currentSprints: currentlyActiveSprints,
    previousSprints: previouslyCompletedSprints,
    futureSprints: upcomingFutureSprints,
    currentSprintStats: currentSprintStatistics,
    previousSprintStats: previousSprintStatistics,
    futureSprintStats: futureSprintStatistics,
    burnup: burnupProgressData,
    storyPointsCurrent: expectedStoryPointsByCurrentDate,
    epicProgress: epicProgressSummaryData,
    raid: raidSummaryByEpic,
    wsjf: wsjfSummaryByEpic,
    piScope: piScopeSummaryByEpic,
    progress: progressSummaryByEpic
  };
}
