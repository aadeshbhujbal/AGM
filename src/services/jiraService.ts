import { fetchWithProxy } from "../utils/fetchWithProxy";
import {
  JiraProject,
  JiraVersion,
  JiraSprint,
  JiraIssue,
  JiraEpic,
  JiraIssueFields,
  JiraSprintState,
  JiraVelocityStats,
} from "../types/jira";

const JIRA_URL = process.env.JIRA_URL;
const JIRA_USER = process.env.JIRA_USER;
const JIRA_TOKEN = process.env.JIRA_TOKEN;

interface JiraCredentials {
  url: string;
  user: string;
  token: string;
}

function validateJiraCredentials(): JiraCredentials {
  if (!JIRA_URL || !JIRA_USER || !JIRA_TOKEN) {
    throw new Error("Jira credentials are not set in environment variables");
  }
  return {
    url: JIRA_URL,
    user: JIRA_USER,
    token: JIRA_TOKEN,
  };
}

export async function getReleasesFromJira(
  projectName?: string
): Promise<JiraVersion[]> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    // 1. Get all projects
    const projectsResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/project`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );
    const allProjects = (await projectsResponse.json()) as JiraProject[];

    // 2. Find project by name or key (case-insensitive)
    const targetProject = allProjects.find((project) =>
      projectName
        ? project.name.toLowerCase() === projectName.toLowerCase() ||
          project.key.toLowerCase() === projectName.toLowerCase()
        : true
    );
    if (!targetProject) {
      console.warn(
        `Project not found: ${projectName}. Available projects: ${allProjects
          .map((p) => p.key)
          .join(", ")}`
      );
      return []; // Return empty array instead of throwing error
    }

    // 3. Get versions (releases) for the project
    const versionsResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/project/${targetProject.key}/versions`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );
    const projectVersions = (await versionsResponse.json()) as JiraVersion[];

    // 4. Get detailed version information for each version
    const detailedVersions = await Promise.all(
      projectVersions.map(async (version) => {
        try {
          const versionResponse = await fetchWithProxy(
            `${credentials.url}/rest/api/3/version/${version.id}`,
            {
              auth: { username: credentials.user, password: credentials.token },
            }
          );
          return (await versionResponse.json()) as JiraVersion;
        } catch (error) {
          console.error(
            `Error fetching version details for ${version.id}:`,
            error
          );
          return version;
        }
      })
    );

    // 5. Map to relevant fields with detailed information
    return detailedVersions.map((version) => ({
      id: version.id,
      name: version.name,
      startDate: version.startDate,
      releaseDate: version.releaseDate,
      released: version.released,
      overdue: version.overdue,
    }));
  } catch (error) {
    console.error(`Error fetching releases for project ${projectName}:`, error);
    return []; // Return empty array instead of throwing error
  }
}

export async function getSprintsFromJira(
  boardId: string,
  state: string = "active,closed,future",
  options?: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
    sprintExcludeFilter?: string;
    sprintIncludeFilter?: string;
    originBoardId?: boolean;
  }
): Promise<JiraSprint[]> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const {
      startDate,
      endDate,
      timezone = "UTC",
      sprintExcludeFilter,
      sprintIncludeFilter,
      originBoardId = true,
    } = options || {};

    // Convert string dates to timezone-aware datetime objects
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;

    if (startDate) {
      // Set to start of day in specified timezone
      startDateObj = new Date(
        startDate + "T00:00:00.000" + (timezone === "UTC" ? "Z" : "")
      );
      if (timezone !== "UTC") {
        // Adjust for timezone offset
        const offset = new Date().getTimezoneOffset();
        startDateObj.setMinutes(startDateObj.getMinutes() - offset);
      }
    }
    if (endDate) {
      // Set to end of day in specified timezone
      endDateObj = new Date(
        endDate + "T23:59:59.999" + (timezone === "UTC" ? "Z" : "")
      );
      if (timezone !== "UTC") {
        // Adjust for timezone offset
        const offset = new Date().getTimezoneOffset();
        endDateObj.setMinutes(endDateObj.getMinutes() - offset);
      }
    }

    // Optimization: Use smaller batch size for faster initial response
    const maxResults = 25;
    let startAt = 0;
    const filteredSprints: Array<{
      id: string;
      name: string;
      startDate: Date;
    }> = [];

    while (true) {
      // Get a batch of sprints
      const queryParams = new URLSearchParams({
        state,
        startAt: startAt.toString(),
        maxResults: maxResults.toString(),
      });

      const sprintResponse = await fetchWithProxy(
        `${credentials.url}/rest/agile/1.0/board/${boardId}/sprint?${queryParams}`,
        { auth: { username: credentials.user, password: credentials.token } }
      );

      if (!sprintResponse.ok) {
        throw new Error(
          `Failed to fetch sprints: ${sprintResponse.status} ${sprintResponse.statusText}`
        );
      }

      const sprintData = (await sprintResponse.json()) as {
        values: Array<{
          id: string;
          name: string;
          startDate?: string;
          endDate?: string;
          state: string;
          originBoardId?: string;
        }>;
        isLast: boolean;
      };

      if (!sprintData.values || sprintData.values.length === 0) {
        break;
      }

      // Process this batch immediately
      for (const sprint of sprintData.values) {
        // Skip if missing required fields
        if (!sprint.id || !sprint.name) {
          continue;
        }

        // Skip sprints without dates
        if (!sprint.startDate || !sprint.endDate) {
          continue;
        }

        // Filter by origin board ID if requested
        if (
          originBoardId &&
          sprint.originBoardId &&
          parseInt(sprint.originBoardId) !== parseInt(boardId)
        ) {
          continue;
        }

        // Filter by sprint name filters
        if (sprintIncludeFilter && !sprint.name.includes(sprintIncludeFilter)) {
          continue;
        }
        if (sprintExcludeFilter && sprint.name.includes(sprintExcludeFilter)) {
          continue;
        }

        try {
          // Parse dates with timezone awareness
          const sprintStart = new Date(sprint.startDate);
          const sprintEnd = new Date(sprint.endDate);

          // Skip invalid dates
          if (isNaN(sprintStart.getTime()) || isNaN(sprintEnd.getTime())) {
            continue;
          }

          // Check if sprint is within the date range (match Python logic)
          if (startDateObj && endDateObj) {
            // Only include sprints that overlap with the date range AND start after start date
            if (!(sprintEnd < startDateObj || sprintStart > endDateObj)) {
              if (sprintStart > startDateObj) {
                filteredSprints.push({
                  id: sprint.id,
                  name: sprint.name,
                  startDate: sprintStart,
                });
              }
            }
          } else if (startDateObj) {
            if (sprintStart > startDateObj) {
              filteredSprints.push({
                id: sprint.id,
                name: sprint.name,
                startDate: sprintStart,
              });
            }
          } else if (endDateObj) {
            if (sprintEnd <= endDateObj) {
              filteredSprints.push({
                id: sprint.id,
                name: sprint.name,
                startDate: sprintStart,
              });
            }
          } else {
            filteredSprints.push({
              id: sprint.id,
              name: sprint.name,
              startDate: sprintStart,
            });
          }
        } catch (error) {
          console.error(`Error parsing dates for sprint ${sprint.id}:`, error);
          continue;
        }
      }

      // Early termination if we've processed all sprints
      if (sprintData.isLast || sprintData.values.length < maxResults) {
        break;
      }

      startAt += maxResults;
    }

    // Sort sprints by start date
    filteredSprints.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    // Convert to JiraSprint format
    const sprints = await Promise.all(
      filteredSprints.map(async (sprint) => {
        const sprintDetails = await fetchWithProxy(
          `${credentials.url}/rest/agile/1.0/sprint/${sprint.id}`,
          { auth: { username: credentials.user, password: credentials.token } }
        );

        if (!sprintDetails.ok) {
          throw new Error(
            `Failed to fetch sprint details: ${sprintDetails.status}`
          );
        }

        const details = (await sprintDetails.json()) as {
          id: number;
          name: string;
          state: string;
          startDate: string;
          endDate: string;
          completeDate?: string;
          originBoardId?: number;
        };

        return {
          id: details.id,
          name: details.name,
          state: details.state as JiraSprintState,
          startDate: details.startDate,
          endDate: details.endDate,
          completeDate: details.completeDate,
          originBoardId: details.originBoardId,
        };
      })
    );

    return sprints;
  } catch (error) {
    console.error(`Error in getSprintsFromJira for board ${boardId}:`, error);
    throw error;
  }
}

export async function getIssuesFromJira(jql: string): Promise<JiraIssue[]> {
  if (!JIRA_URL || !JIRA_USER || !JIRA_TOKEN) {
    throw new Error("Jira credentials are not set in environment variables");
  }

  const issues: JiraIssue[] = [];
  let startAt = 0;
  const maxResults = 1000;

  try {
    const credentials = validateJiraCredentials();

    while (true) {
      const requiredFields = [
        "summary",
        "status",
        "customfield_10002", // Story Points
        "parent",
        "assignee",
        "created",
        "updated",
        "customfield_10341", // Sprint
        "customfield_30160", // RAID
        "customfield_42105", // WSJF
        "customfield_20046", // PI Scope
        "customfield_30195", // Progress
        "issuetype",
        "project",
        "fixVersions",
        "components",
        "priority",
        "labels",
        "description",
        "resolution",
        "resolutiondate",
      ];

      const queryParams = new URLSearchParams({
        jql,
        startAt: startAt.toString(),
        maxResults: maxResults.toString(),
        fields: requiredFields.join(","),
      });

      const issueResponse = await fetchWithProxy(
        `${credentials.url}/rest/api/3/search?${queryParams}`,
        {
          auth: { username: credentials.user, password: credentials.token },
        }
      );

      const issueData = (await issueResponse.json()) as any;
      if (!issueData.issues || issueData.issues.length === 0) break;

      issues.push(...issueData.issues);
      if (issueData.issues.length < maxResults) break;
      startAt += maxResults;
    }

    return issues;
  } catch (error) {
    console.error(`Error fetching issues with JQL: ${jql}`, error);
    throw error;
  }
}

export async function getEpicsFromJira(boardId: string): Promise<JiraEpic[]> {
  if (!JIRA_URL || !JIRA_USER || !JIRA_TOKEN) {
    throw new Error("Jira credentials are not set in environment variables");
  }

  try {
    const credentials = validateJiraCredentials();

    // Get the project key for the board
    const boardResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board/${boardId}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );
    const boardData = (await boardResponse.json()) as {
      location?: { projectKey: string };
    };
    if (!boardData.location) {
      throw new Error(`Board ${boardId} has no location/project information`);
    }
    const projectKey = boardData.location.projectKey;

    // Search for epics in that project
    const epicJql = `project = "${projectKey}" AND issuetype in (Epic, Feature) ORDER BY created DESC`;
    const epicFields = [
      "summary",
      "status",
      "customfield_10002",
      "parent",
      "assignee",
      "created",
      "updated",
      "customfield_10341",
      "customfield_30160",
      "customfield_42105",
      "customfield_20046",
      "customfield_30195",
      "issuetype",
      "project",
      "description",
    ];

    const queryParams = new URLSearchParams({
      jql: epicJql,
      maxResults: "100",
      fields: epicFields.join(","),
    });

    const epicResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/search?${queryParams}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    const epicIssues =
      ((await epicResponse.json()) as { issues: JiraIssue[] }).issues || [];

    // Convert JiraIssue to JiraEpic format
    return epicIssues.map(
      (epicIssue: JiraIssue): JiraEpic => ({
        id: epicIssue.id,
        key: epicIssue.key,
        fields: epicIssue.fields,
      })
    );
  } catch (error) {
    console.error(`Error fetching epics for board ${boardId}:`, error);
    throw error;
  }
}

// New helpers for velocityService
export async function getBoardIdFromProjectKey(
  projectKey: string
): Promise<string> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    // First, get all boards
    const boardsResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!boardsResponse.ok) {
      throw new Error(
        `Failed to fetch boards: ${boardsResponse.status} ${boardsResponse.statusText}`
      );
    }

    const boardsData = (await boardsResponse.json()) as {
      values: Array<{ id: number; location?: { projectKey: string } }>;
    };

    // Find board for the project - handle boards without location
    const board = boardsData.values.find(
      (b) => b.location && b.location.projectKey === projectKey
    );

    if (!board) {
      console.error(
        `No board found for project key: ${projectKey}. Available boards:`,
        boardsData.values.map((b) => ({ id: b.id, location: b.location }))
      );
      throw new Error(
        `No board found for project key: ${projectKey}. Please check if the project has any boards configured in Jira.`
      );
    }

    return board.id.toString();
  } catch (error) {
    console.error(`Error getting board ID for project ${projectKey}:`, error);
    throw error;
  }
}

export async function getClosedSprintsFromJira(
  boardIdOrProjectKey: string
): Promise<JiraSprint[]> {
  // Check if boardIdOrProjectKey is numeric (board ID) or string (project key)
  const isNumeric = /^\d+$/.test(boardIdOrProjectKey);

  if (isNumeric) {
    // It's already a board ID
    return getSprintsFromJira(boardIdOrProjectKey, "closed");
  } else {
    // It's a project key, need to get the board ID first
    const boardId = await getBoardIdFromProjectKey(boardIdOrProjectKey);
    return getSprintsFromJira(boardId, "closed");
  }
}

export async function getSprintIssuesWithAssignee(
  sprintId: number
): Promise<JiraIssue[]> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const queryParams = new URLSearchParams({
      fields:
        "assignee,created,customfield_10002,summary,status,issuetype,project",
    });

    const sprintIssuesResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/sprint/${sprintId}/issue?${queryParams}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );
    return (
      ((await sprintIssuesResponse.json()) as { issues: JiraIssue[] }).issues ||
      []
    );
  } catch (error) {
    console.error(
      `Error fetching sprint issues for sprint ${sprintId}:`,
      error
    );
    throw error;
  }
}

export async function getVelocityStatsFromJira(
  boardIdOrProjectKey: string
): Promise<JiraVelocityStats> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    // Check if boardIdOrProjectKey is numeric (board ID) or string (project key)
    const isNumeric = /^\d+$/.test(boardIdOrProjectKey);
    let boardId = boardIdOrProjectKey;

    if (!isNumeric) {
      // It's a project key, need to get the board ID first
      boardId = await getBoardIdFromProjectKey(boardIdOrProjectKey);
    }

    // Use the Jira REST API for velocity stats (GreenHopper API is deprecated, but this endpoint still works)
    const velocityResponse = await fetchWithProxy(
      `${credentials.url}/rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${boardId}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!velocityResponse.ok) {
      throw new Error(
        `Failed to fetch velocity stats: ${velocityResponse.status} ${velocityResponse.statusText}`
      );
    }

    return (await velocityResponse.json()) as JiraVelocityStats;
  } catch (error) {
    console.error(
      `Error fetching velocity stats for board/project ${boardIdOrProjectKey}:`,
      error
    );
    throw error;
  }
}

/**
 * Get Jira release status for a version (Python equivalent)
 * Python: def get_jira_release_status(version_id):
 */
export async function getJiraReleaseStatus(versionId: string): Promise<string> {
  try {
    const credentials = validateJiraCredentials();

    // Get version details
    const versionResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/version/${versionId}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!versionResponse.ok) {
      return "On Track";
    }

    const version = (await versionResponse.json()) as { releaseDate?: string };

    if (!version.releaseDate) {
      return "No release date set";
    }

    const releaseDate = new Date(version.releaseDate);
    let startAt = 0;
    const maxResults = 1000;
    let onTrack = false;

    while (true) {
      const jqlQuery = `fixVersion = ${versionId} AND sprint is not EMPTY`;
      const issues = await getIssuesFromJira(jqlQuery);

      if (issues.length === 0) {
        break;
      }

      for (const issue of issues) {
        const sprints = issue.fields.customfield_10341;
        if (sprints) {
          for (const sprint of sprints as any[]) {
            if (sprint.endDate && sprint.state !== "closed") {
              const sprintEndDate = new Date(sprint.endDate);
              if (sprintEndDate > releaseDate) {
                const daysDifference = Math.floor(
                  (sprintEndDate.getTime() - releaseDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (daysDifference <= 7) {
                  onTrack = true;
                } else {
                  return "Off Track";
                }
              }
            }
          }
        }
      }

      if (issues.length < maxResults) {
        break;
      }
      startAt += maxResults;
    }

    return onTrack ? "On Track Threshold" : "On Track";
  } catch (error) {
    console.error(
      `Error getting release status for version ${versionId}:`,
      error
    );
    return "On Track";
  }
}

/**
 * Get project key by exact name (Python equivalent)
 * Python: def get_project_key_by_exact_name(project_name):
 */
export async function getProjectKeyByExactName(
  projectName: string
): Promise<{ key: string | null; name: string | null }> {
  try {
    const credentials = validateJiraCredentials();

    // Get all projects
    const projectsResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/project`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }

    const projects = (await projectsResponse.json()) as Array<{
      key: string;
      name: string;
    }>;

    // Look for exact match first (case-sensitive)
    const exactMatch = projects.find((p) => p.name === projectName);
    if (exactMatch) {
      return { key: exactMatch.key, name: exactMatch.name };
    }

    // If no exact match, try case-insensitive exact match
    const caseInsensitiveMatch = projects.find(
      (p) => p.name.toLowerCase() === projectName.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return { key: caseInsensitiveMatch.key, name: caseInsensitiveMatch.name };
    }

    console.log(`No exact match found for project name: '${projectName}'`);
    return { key: null, name: null };
  } catch (error) {
    console.error(`Error finding project:`, error);
    return { key: null, name: null };
  }
}

/**
 * Get Jira status categories for a project (Python equivalent)
 * Python: def get_jira_status_categories(project_key):
 */
export async function getJiraStatusCategories(projectKey: string): Promise<{
  "To Do": string[];
  "In Progress": string[];
  Done: string[];
}> {
  const statusCategories = {
    "To Do": [] as string[],
    "In Progress": [] as string[],
    Done: [] as string[],
  };

  try {
    const credentials = validateJiraCredentials();

    // Get project configuration (includes workflow info)
    const projectConfigResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/project/${projectKey}/statuses`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!projectConfigResponse.ok) {
      throw new Error(
        `Failed to fetch project statuses: ${projectConfigResponse.status}`
      );
    }

    const projectConfig = (await projectConfigResponse.json()) as Array<{
      statuses: Array<{ name: string; statusCategory: { key: string } }>;
    }>;

    // Process each status configuration
    for (const statusConfig of projectConfig) {
      for (const status of statusConfig.statuses || []) {
        const statusName = status.name;
        const categoryKey = status.statusCategory?.key || "unknown";

        // Map category key to our categories
        if (categoryKey === "new") {
          statusCategories["To Do"].push(statusName);
        } else if (categoryKey === "indeterminate") {
          statusCategories["In Progress"].push(statusName);
        } else if (categoryKey === "done") {
          statusCategories["Done"].push(statusName);
        }
      }
    }
  } catch (error) {
    console.error(`Error getting project statuses:`, error);
    console.log("Falling back to getting all statuses (not project-specific)");
  }

  return statusCategories;
}

/**
 * Custom date formatting utility (Python equivalent)
 * Python: def custom_date(date_format, t):
 */
export function customDate(dateFormat: string, date: Date): string {
  const suffix = (d: number): string => {
    if (d >= 11 && d <= 13) return "th";
    const lastDigit = d % 10;
    switch (lastDigit) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return dateFormat.replace("{S}", date.getDate() + suffix(date.getDate()));
}

/**
 * Parse date utility (Python equivalent)
 * Python: def parse_date(date_string):
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get release plan for a project (Python equivalent)
 * Python: def get_release_plan(name):
 */
export async function getReleasePlan(projectName: string): Promise<
  Array<{
    projectKey: string;
    projectName: string;
    version: string;
    startDate: string;
    endDate: string;
    status: string;
    track: string;
  }>
> {
  try {
    const credentials = validateJiraCredentials();

    // Get all projects
    const projectsResponse = await fetchWithProxy(
      `${credentials.url}/rest/api/3/project`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }

    const projects = (await projectsResponse.json()) as Array<{
      key: string;
      name: string;
    }>;
    const releaseData: Array<{
      projectKey: string;
      projectName: string;
      version: string;
      startDate: string;
      endDate: string;
      status: string;
      track: string;
    }> = [];

    for (const project of projects) {
      if (project.name === projectName) {
        // Get project versions
        const versionsResponse = await fetchWithProxy(
          `${credentials.url}/rest/api/3/project/${project.key}/versions`,
          {
            auth: { username: credentials.user, password: credentials.token },
          }
        );

        if (!versionsResponse.ok) {
          continue;
        }

        const versions = (await versionsResponse.json()) as Array<{
          id: string;
          name: string;
          releaseDate?: string;
          startDate?: string;
          released: boolean;
          overdue: boolean;
        }>;

        for (const version of versions) {
          if (version.releaseDate || version.startDate) {
            const startDate = version.startDate || "N/A";
            const endDate = version.releaseDate || "N/A";
            const status = version.released ? "Released" : "Unreleased";
            const track = version.released
              ? "On Track"
              : await getJiraReleaseStatus(version.id);

            releaseData.push({
              projectKey: project.key,
              projectName: project.name,
              version: version.name,
              startDate,
              endDate,
              status,
              track,
            });
          }
        }
        break;
      }
    }

    return releaseData;
  } catch (error) {
    console.error(
      `Error getting release plan for project ${projectName}:`,
      error
    );
    return [];
  }
}

/**
 * Get detailed information about a specific board (Python equivalent)
 * Python: def get_board_details(board_id):
 */
export async function getBoardDetails(boardId: string): Promise<{
  id: number;
  name: string;
  type: string;
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
    displayName: string;
    projectNameKey: string;
  };
  filter?: {
    id: number;
    name: string;
    query: string;
  };
  subQuery?: {
    query: string;
  };
  columnConfig?: {
    columns: Array<{
      name: string;
      statuses: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
}> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const boardResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board/${boardId}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!boardResponse.ok) {
      throw new Error(
        `Failed to fetch board details: ${boardResponse.status} ${boardResponse.statusText}`
      );
    }

    const boardData = (await boardResponse.json()) as {
      id: number;
      name: string;
      type: string;
      location?: {
        projectId: number;
        projectKey: string;
        projectName: string;
        displayName: string;
        projectNameKey: string;
      };
      filter?: {
        id: number;
        name: string;
        query: string;
      };
      subQuery?: {
        query: string;
      };
      columnConfig?: {
        columns: Array<{
          name: string;
          statuses: Array<{
            id: string;
            name: string;
          }>;
        }>;
      };
    };

    return boardData;
  } catch (error) {
    console.error(`Error fetching board details for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Get all boards with optional filtering (Python equivalent)
 * Python: def get_all_boards(project_key=None, board_type=None):
 */
export async function getAllBoards(options?: {
  projectKey?: string;
  boardType?: string;
  includeDetails?: boolean;
}): Promise<
  Array<{
    id: number;
    name: string;
    type: string;
    location?: {
      projectId: number;
      projectKey: string;
      projectName: string;
      displayName: string;
      projectNameKey: string;
    };
    filter?: {
      id: number;
      name: string;
      query: string;
    };
  }>
> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const boardsResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!boardsResponse.ok) {
      throw new Error(
        `Failed to fetch boards: ${boardsResponse.status} ${boardsResponse.statusText}`
      );
    }

    const boardsData = (await boardsResponse.json()) as {
      values: Array<{
        id: number;
        name: string;
        type: string;
        location?: {
          projectId: number;
          projectKey: string;
          projectName: string;
          displayName: string;
          projectNameKey: string;
        };
        filter?: {
          id: number;
          name: string;
          query: string;
        };
      }>;
    };

    let filteredBoards = boardsData.values;

    console.log(`[DEBUG] Total boards found: ${boardsData.values.length}`);
    console.log(
      `[DEBUG] Available boards:`,
      boardsData.values.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        projectKey: b.location?.projectKey,
      }))
    );

    // Filter by project key if specified
    if (options?.projectKey) {
      const beforeFilter = filteredBoards.length;
      filteredBoards = filteredBoards.filter(
        (board) =>
          board.location && board.location.projectKey === options.projectKey
      );
      console.log(
        `[DEBUG] Filtered by projectKey '${options.projectKey}': ${beforeFilter} -> ${filteredBoards.length} boards`
      );
    }

    // Filter by board type if specified
    if (options?.boardType) {
      const beforeFilter = filteredBoards.length;
      filteredBoards = filteredBoards.filter(
        (board) => board.type === options.boardType
      );
      console.log(
        `[DEBUG] Filtered by boardType '${options.boardType}': ${beforeFilter} -> ${filteredBoards.length} boards`
      );
    }

    // Include detailed information if requested
    if (options?.includeDetails) {
      console.log(
        `[DEBUG] Fetching detailed information for ${filteredBoards.length} boards`
      );
      const detailedBoards = await Promise.all(
        filteredBoards.map(async (board) => {
          try {
            const details = await getBoardDetails(board.id.toString());
            return {
              ...board,
              ...details,
            };
          } catch (error) {
            console.error(
              `[DEBUG] Failed to get details for board ${board.id}:`,
              error
            );
            return board;
          }
        })
      );
      return detailedBoards;
    }

    return filteredBoards;
  } catch (error) {
    console.error("Error fetching all boards:", error);
    throw error;
  }
}

/**
 * Get board configuration including columns and statuses (Python equivalent)
 * Python: def get_board_configuration(board_id):
 */
export async function getBoardConfiguration(boardId: string): Promise<{
  id: number;
  name: string;
  columns: Array<{
    name: string;
    statuses: Array<{
      id: string;
      name: string;
    }>;
  }>;
  constraintType: string;
  subQuery?: {
    query: string;
  };
}> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const configResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board/${boardId}/configuration`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!configResponse.ok) {
      throw new Error(
        `Failed to fetch board configuration: ${configResponse.status} ${configResponse.statusText}`
      );
    }

    const configData = (await configResponse.json()) as {
      id: number;
      name: string;
      columns: Array<{
        name: string;
        statuses: Array<{
          id: string;
          name: string;
        }>;
      }>;
      constraintType: string;
      subQuery?: {
        query: string;
      };
    };

    return configData;
  } catch (error) {
    console.error(
      `Error fetching board configuration for board ${boardId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get issues for a specific board with optional filtering (Python equivalent)
 * Python: def get_board_issues(board_id, jql=None, max_results=1000):
 */
export async function getBoardIssues(
  boardId: string,
  options?: {
    jql?: string;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
  }
): Promise<{
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const {
      jql,
      maxResults = 1000,
      fields = [
        "summary",
        "status",
        "assignee",
        "created",
        "updated",
        "issuetype",
        "project",
        "priority",
        "labels",
        "description",
        "customfield_10002", // Story Points
        "customfield_10341", // Sprint
        "customfield_30160", // RAID
        "customfield_42105", // WSJF
        "customfield_20046", // PI Scope
        "customfield_30195", // Progress
      ],
      expand = [],
    } = options || {};

    const queryParams = new URLSearchParams({
      startAt: "0",
      maxResults: maxResults.toString(),
      fields: fields.join(","),
    });

    if (jql) {
      queryParams.append("jql", jql);
    }

    if (expand.length > 0) {
      queryParams.append("expand", expand.join(","));
    }

    const issuesResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board/${boardId}/issue?${queryParams}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!issuesResponse.ok) {
      throw new Error(
        `Failed to fetch board issues: ${issuesResponse.status} ${issuesResponse.statusText}`
      );
    }

    const issuesData = (await issuesResponse.json()) as {
      issues: JiraIssue[];
      total: number;
      startAt: number;
      maxResults: number;
    };

    return issuesData;
  } catch (error) {
    console.error(`Error fetching board issues for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Get board backlog issues (Python equivalent)
 * Python: def get_board_backlog(board_id):
 */
export async function getBoardBacklog(boardId: string): Promise<{
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const queryParams = new URLSearchParams({
      startAt: "0",
      maxResults: "1000",
      fields:
        "summary,status,assignee,created,updated,issuetype,project,priority,labels,description,customfield_10002,customfield_10341,customfield_30160,customfield_42105,customfield_20046,customfield_30195",
    });

    const backlogResponse = await fetchWithProxy(
      `${credentials.url}/rest/agile/1.0/board/${boardId}/backlog?${queryParams}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!backlogResponse.ok) {
      throw new Error(
        `Failed to fetch board backlog: ${backlogResponse.status} ${backlogResponse.statusText}`
      );
    }

    const backlogData = (await backlogResponse.json()) as {
      issues: JiraIssue[];
      total: number;
      startAt: number;
      maxResults: number;
    };

    return backlogData;
  } catch (error) {
    console.error(`Error fetching board backlog for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Get board rapid views (for velocity charts) (Python equivalent)
 * Python: def get_board_rapid_views(board_id):
 */
export async function getBoardRapidViews(boardId: string): Promise<
  Array<{
    id: number;
    name: string;
    canEdit: boolean;
    sprintSupportEnabled: boolean;
  }>
> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    const rapidViewsResponse = await fetchWithProxy(
      `${credentials.url}/rest/greenhopper/1.0/rapidview?rapidViewId=${boardId}`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!rapidViewsResponse.ok) {
      throw new Error(
        `Failed to fetch board rapid views: ${rapidViewsResponse.status} ${rapidViewsResponse.statusText}`
      );
    }

    const rapidViewsData = (await rapidViewsResponse.json()) as {
      views: Array<{
        id: number;
        name: string;
        canEdit: boolean;
        sprintSupportEnabled: boolean;
      }>;
    };

    return rapidViewsData.views || [];
  } catch (error) {
    console.error(
      `Error fetching board rapid views for board ${boardId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get board statistics and metrics (Python equivalent)
 * Python: def get_board_statistics(board_id):
 */
export async function getBoardStatistics(boardId: string): Promise<{
  boardId: number;
  totalIssues: number;
  issuesInSprint: number;
  issuesInBacklog: number;
  completedIssues: number;
  inProgressIssues: number;
  toDoIssues: number;
  velocity: {
    estimated: number;
    completed: number;
  };
}> {
  validateJiraCredentials();

  try {
    const credentials = validateJiraCredentials();

    // Get board issues
    const boardIssues = await getBoardIssues(boardId);

    // Get velocity stats
    const velocityStats = await getVelocityStatsFromJira(boardId);

    // Calculate statistics
    const totalIssues = boardIssues.total;
    let issuesInSprint = 0;
    let issuesInBacklog = 0;
    let completedIssues = 0;
    let inProgressIssues = 0;
    let toDoIssues = 0;

    for (const issue of boardIssues.issues) {
      const status = issue.fields.status?.name?.toLowerCase() || "";
      const sprints = issue.fields.customfield_10341;

      if (sprints && Array.isArray(sprints) && sprints.length > 0) {
        issuesInSprint++;
      } else {
        issuesInBacklog++;
      }

      if (status.includes("done") || status.includes("complete")) {
        completedIssues++;
      } else if (
        status.includes("progress") ||
        status.includes("development")
      ) {
        inProgressIssues++;
      } else {
        toDoIssues++;
      }
    }

    return {
      boardId: parseInt(boardId),
      totalIssues,
      issuesInSprint,
      issuesInBacklog,
      completedIssues,
      inProgressIssues,
      toDoIssues,
      velocity: {
        estimated:
          velocityStats.velocityStatEntries?.latest?.estimated?.value || 0,
        completed:
          velocityStats.velocityStatEntries?.latest?.completed?.value || 0,
      },
    };
  } catch (error) {
    console.error(
      `Error fetching board statistics for board ${boardId}:`,
      error
    );
    throw error;
  }
}
