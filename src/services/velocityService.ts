import {
  VelocitySummaryOptions,
  VelocitySummaryResult,
} from "../types/velocity";
import {
  getClosedSprintsFromJira,
  getVelocityStatsFromJira,
  getIssuesFromJira,
  getSprintIssuesWithAssignee,
} from "./jiraService";

export async function getVelocitySummary(
  options: VelocitySummaryOptions
): Promise<VelocitySummaryResult> {
  const { boardId, numSprints, year, sprintPrefix } = options;

  try {
    console.log(`[DEBUG] Getting velocity summary for: ${boardId}`);

    // 1. Get closed sprints for the board/project
    let sprints = await getClosedSprintsFromJira(boardId);
    console.log(
      `[DEBUG] Found ${sprints.length} closed sprints for ${boardId}`
    );
    if (sprintPrefix) {
      sprints = sprints.filter(
        (sprint) => sprint.name && sprint.name.startsWith(sprintPrefix)
      );
    }
    if (year) {
      sprints = sprints.filter((sprint) => {
        if (!sprint.startDate) return false;
        const sprintDate = new Date(sprint.startDate);
        return sprintDate.getFullYear() === year;
      });
    }
    // Sort sprints by ID in reverse order (Python equivalent)
    sprints = sprints.sort((firstSprint, secondSprint) => {
      return secondSprint.id - firstSprint.id;
    });
    if (numSprints) {
      sprints = sprints.slice(0, numSprints);
    }

    // 2. Get velocity stats - this will handle both board IDs and project keys
    const velocityData = await getVelocityStatsFromJira(boardId);
    const sprintVelocities = [];

    for (const sprint of sprints) {
      // 3. Get velocity stats for the sprint (Python equivalent)
      const sprintStat =
        (velocityData.velocityStatEntries &&
          velocityData.velocityStatEntries[sprint.id.toString()]) ||
        {};
      const committed = sprintStat.estimated?.value || 0;
      const completed = sprintStat.completed?.value || 0;

      // 4. Get team members for the sprint
      const issues = await getSprintIssuesWithAssignee(sprint.id);
      const assigneeAccountIds = new Set(
        (issues || [])
          .map((issue) => issue.fields.assignee?.accountId)
          .filter((accountId): accountId is string => Boolean(accountId))
      );
      const teamMembersCount =
        assigneeAccountIds.size === 0 ? 15 : assigneeAccountIds.size; // Python equivalent: default to 15 if no team members found

      // 5. Calculate allotted and optimal story points
      const allottedStoryPoints = teamMembersCount * 8; // 8 SP per team member
      const optimalStoryPoints = teamMembersCount * 5; // 5 SP per team member

      // 6. Get added story points (issues created after sprint start)
      let addedStoryPoints = 0;
      for (const issue of issues || []) {
        const createdDate = new Date(issue.fields.created || "");
        const sprintStartDate = new Date(sprint.startDate || "");
        if (createdDate > sprintStartDate) {
          addedStoryPoints += issue.fields.customfield_10002 || 0;
        }
      }

      // 7. Calculate efficiencies and spillover
      const efficiency =
        committed > 0 ? Math.round((completed / committed) * 100) : 0;
      const efficiencyBasedOnAllotted =
        allottedStoryPoints > 0
          ? Math.round((completed / allottedStoryPoints) * 100)
          : 0;
      const spillover = Math.max(0, committed - completed);

      sprintVelocities.push({
        sprintId: sprint.id,
        sprintName: sprint.name || "",
        startDate: sprint.startDate || "",
        endDate: sprint.endDate || "",
        committed,
        completed,
        teamMembers: teamMembersCount,
        addedStoryPoints,
        efficiency,
        allottedStoryPoints,
        optimalStoryPoints,
        efficiencyBasedOnAllotted,
        spillover,
      });
    }

    // 8. Calculate latest sprint efficiency for summary
    const latestSprint = sprintVelocities[0];
    const summaryEfficiency = latestSprint ? latestSprint.efficiency : 0;

    return {
      sprints: sprintVelocities,
      boardId,
      summary: `Velocity summary for board ${boardId} (Latest Sprint Efficiency: ${summaryEfficiency}%)`,
      latestSprintEfficiency: summaryEfficiency,
    };
  } catch (error) {
    console.error(`Error in getVelocitySummary for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Get sprint team members with details (Python equivalent)
 * Python: def get_sprint_team_members_details(jira_url, sprint_id, username, api_token):
 */
export async function getSprintTeamMembersDetails(sprintId: number): Promise<{
  count: number;
  members: Array<{ name: string; email: string; accountId: string }>;
}> {
  try {
    const issues = await getSprintIssuesWithAssignee(sprintId);
    const memberMap = new Map<
      string,
      { name: string; email: string; accountId: string }
    >();

    for (const issue of issues || []) {
      const assignee = issue.fields.assignee;
      if (assignee && assignee.accountId) {
        if (!memberMap.has(assignee.accountId)) {
          memberMap.set(assignee.accountId, {
            name: assignee.displayName || "Unknown",
            email: "", // Jira API doesn't provide email in assignee field
            accountId: assignee.accountId,
          });
        }
      }
    }

    const members = Array.from(memberMap.values());

    return {
      count: members.length,
      members,
    };
  } catch (error) {
    console.error(
      `Error getting team member details for sprint ${sprintId}:`,
      error
    );
    return {
      count: 0,
      members: [],
    };
  }
}

/**
 * Get sprint team members count (Python equivalent)
 * Python: def get_sprint_team_members(jira_url, sprint_id, username, api_token):
 */
export async function getSprintTeamMembers(sprintId: number): Promise<number> {
  try {
    const issues = await getSprintIssuesWithAssignee(sprintId);
    const assigneeAccountIds = new Set(
      (issues || [])
        .map((issue) => issue.fields.assignee?.accountId)
        .filter((accountId): accountId is string => Boolean(accountId))
    );
    return assigneeAccountIds.size;
  } catch (error) {
    console.error(`Error getting team members for sprint ${sprintId}:`, error);
    return 0;
  }
}

/**
 * Get added story points for issues created after sprint start (Python equivalent)
 * Python: def get_added_story_points(jira_url, sprint_id, start_date, username, api_token):
 */
export async function getAddedStoryPoints(
  sprintId: number,
  startDate: string
): Promise<number> {
  try {
    const jqlQuery = `sprint = ${sprintId} AND created > "${startDate}"`;
    const issues = await getIssuesFromJira(jqlQuery);

    let totalAddedStoryPoints = 0;
    for (const issue of issues) {
      const storyPoints = issue.fields.customfield_10002 || 0;
      totalAddedStoryPoints += storyPoints;
    }

    return totalAddedStoryPoints;
  } catch (error) {
    console.error(
      `Error getting added story points for sprint ${sprintId}:`,
      error
    );
    return 0;
  }
}

/**
 * Get velocity chart data (Python equivalent)
 * Python: def get_velocity_chart_data(jira_url, board_id, username, api_token, num_sprints=None, year_filter=None, sprint_prefix=None):
 */
export async function getVelocityChartData(
  boardId: string,
  options: {
    numSprints?: number;
    yearFilter?: number;
    sprintPrefix?: string;
  } = {}
): Promise<
  Array<{
    sprint: string;
    sprintId: number;
    startDate: string;
    endDate: string;
    allottedSPs: number;
    commitment: number;
    completed: number;
    addedSPs: number;
    teamMembers: number;
    efficiency: number;
    efficiencyBasedOnAllotted: number;
    optimalSP: number;
  }>
> {
  try {
    const { numSprints, yearFilter, sprintPrefix } = options;

    // Get sprints from Jira
    const sprints = await getClosedSprintsFromJira(boardId);

    // Filter sprints based on options
    let filteredSprints = sprints;

    if (yearFilter) {
      filteredSprints = filteredSprints.filter((sprint) => {
        if (!sprint.startDate) return false;
        const sprintDate = new Date(sprint.startDate);
        return sprintDate.getFullYear() === yearFilter;
      });
    }

    if (sprintPrefix) {
      filteredSprints = filteredSprints.filter(
        (sprint) => sprint.name && sprint.name.startsWith(sprintPrefix)
      );
    }

    if (numSprints) {
      filteredSprints = filteredSprints.slice(-numSprints);
    }

    // Sort by sprint ID in reverse order (Python equivalent)
    filteredSprints.sort((a, b) => {
      return b.id - a.id;
    });

    const velocityData = [];

    for (const sprint of filteredSprints) {
      const sprintId = sprint.id;
      const startDate = sprint.startDate || "";
      const endDate = sprint.endDate || "";

      if (!startDate || !endDate) continue;

      // Get velocity stats for the sprint (Python equivalent)
      const velocityDataForBoard = await getVelocityStatsFromJira(boardId);
      const sprintStat =
        (velocityDataForBoard.velocityStatEntries &&
          velocityDataForBoard.velocityStatEntries[sprintId.toString()]) ||
        {};
      const commitment = sprintStat.estimated?.value || 0;
      const completed = sprintStat.completed?.value || 0;

      // Get team members count
      const teamMembers = await getSprintTeamMembers(sprintId);

      // Get added story points
      const addedSPs = await getAddedStoryPoints(sprintId, startDate);

      // Calculate efficiencies
      const allottedSPs = teamMembers * 8; // 8 SP per team member
      const efficiency = commitment > 0 ? (completed / commitment) * 100 : 0;
      const efficiencyBasedOnAllotted =
        allottedSPs > 0 ? (completed / allottedSPs) * 100 : 0;

      // Calculate optimal SP (based on team size and historical efficiency)
      const optimalSP = Math.round(teamMembers * 8 * (efficiency / 100));

      velocityData.push({
        sprint: sprint.name,
        sprintId,
        startDate,
        endDate,
        allottedSPs,
        commitment,
        completed,
        addedSPs,
        teamMembers,
        efficiency,
        efficiencyBasedOnAllotted,
        optimalSP,
      });
    }

    return velocityData;
  } catch (error) {
    console.error(
      `Error getting velocity chart data for board ${boardId}:`,
      error
    );
    return [];
  }
}
