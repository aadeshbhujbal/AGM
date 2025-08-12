import { EpicData, EpicSummaryOptions, EpicTableRow } from "../types/epic";
import { JiraIssue } from "../types/jira";
import { getIssuesFromJira } from "./jiraService";
import { fetchWithProxy } from "../utils/fetchWithProxy";
import config from "../config";

export async function getEpicDetails(
  epicKey: string
): Promise<EpicData | null> {
  try {
    // Get epic details using existing Jira service
    const jql = `key = ${epicKey}`;
    const epicIssues = await getIssuesFromJira(jql);

    if (epicIssues.length === 0) {
      console.error(`Epic ${epicKey} not found`);
      return null;
    }

    const epicIssue = epicIssues[0];
    const epicFields = epicIssue.fields;

    // Extract RAID information
    const raidInformation = parseRaidField(epicFields.customfield_30160);

    // Extract PI Objective and Progress
    const piObjective = epicFields.customfield_20046 || "";
    const piProgress = epicFields.customfield_30195 || "";

    // Calculate story points
    const storyPointsData = await calculateEpicStoryPoints(
      epicKey,
      epicFields.customfield_10002 || 0
    );

    return {
      epicKey: epicIssue.key,
      epicSummary: epicFields.summary || "",
      epicUrl: `${config.jiraUrl}/browse/${epicIssue.key}`,
      storyPoints: storyPointsData,
      piObjective,
      piProgressUpdate: piProgress,
      raid: raidInformation,
      status: epicFields.status?.name || "",
      assignee: epicFields.assignee?.displayName,
      created: epicFields.created,
      updated: epicFields.updated,
    };
  } catch (error) {
    console.error(`Error fetching epic ${epicKey}:`, error);
    return null;
  }
}

export async function getEpicSummary(
  options: EpicSummaryOptions
): Promise<EpicTableRow[]> {
  const { projectKey, boardId, piStartDate, piEndDate, sprintIds } = options;

  // Build JQL query to get epics
  let jql = `project = "${projectKey}" AND issuetype = Epic`;

  if (sprintIds && sprintIds.length > 0) {
    jql += ` AND Sprint in (${sprintIds.join(",")})`;
  }

  if (piStartDate && piEndDate) {
    jql += ` AND (created >= "${piStartDate}" OR updated >= "${piStartDate}")`;
  }

  try {
    const epicIssues = await getIssuesFromJira(jql);
    const epicRows: EpicTableRow[] = [];

    for (const epicIssue of epicIssues) {
      const epicData = await getEpicDetails(epicIssue.key);
      if (epicData) {
        const storyPointsFormatted = formatStoryPoints(epicData.storyPoints);
        const raidFormatted = formatRaid(epicData.raid);

        epicRows.push({
          epic: `${epicData.epicUrl} ${epicIssue.key} Can't find link`,
          piObjective: epicData.piObjective,
          piProgressUpdate: epicData.piProgressUpdate,
          raid: raidFormatted,
          storyPoints: storyPointsFormatted,
        });
      }
    }

    return epicRows;
  } catch (error) {
    console.error("Error fetching epic summary:", error);
    throw error;
  }
}

/**
 * Get epic summary (Python equivalent)
 * Python: def get_epic_summary(epic):
 */
export async function getEpicSummaryByKey(epicKey: string): Promise<string> {
  try {
    const credentials = {
      url: process.env.JIRA_URL!,
      user: process.env.JIRA_USER!,
      token: process.env.JIRA_TOKEN!,
    };

    const response = await fetchWithProxy(
      `${credentials.url}/rest/api/3/issue/${epicKey}?fields=summary`,
      {
        auth: { username: credentials.user, password: credentials.token },
      }
    );

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as { fields: { summary: string } };
    const formattedSummary = data.fields.summary.replace(/\n/g, "<br/>");
    return formattedSummary;
  } catch (error) {
    console.error(`Error getting epic summary for ${epicKey}:`, error);
    return "";
  }
}

function parseRaidField(raidField: string | undefined): {
  risks: string[];
  assumptions: string[];
  issues: string[];
  dependencies: string[];
} {
  const raidData = {
    risks: [] as string[],
    assumptions: [] as string[],
    issues: [] as string[],
    dependencies: [] as string[],
  };

  if (!raidField) return raidData;

  const raidText =
    typeof raidField === "string" ? raidField : JSON.stringify(raidField);

  // Parse RAID text to extract different categories
  const raidLines = raidText.split("\n");

  for (const line of raidLines) {
    const trimmedLine = line.trim().toLowerCase();
    if (trimmedLine.startsWith("risk")) {
      raidData.risks.push(line.trim());
    } else if (trimmedLine.startsWith("assumption")) {
      raidData.assumptions.push(line.trim());
    } else if (trimmedLine.startsWith("issue")) {
      raidData.issues.push(line.trim());
    } else if (trimmedLine.startsWith("dependency")) {
      raidData.dependencies.push(line.trim());
    }
  }

  return raidData;
}

async function calculateEpicStoryPoints(
  epicKey: string,
  epicStoryPoints: number
): Promise<{
  original: number;
  added: number;
  completed: number;
  total: number;
}> {
  // Get all child issues for the epic
  const jql = `parent = ${epicKey}`;

  try {
    const childIssues = await getIssuesFromJira(jql);
    let originalStoryPoints = epicStoryPoints;
    let addedStoryPoints = 0;
    let completedStoryPoints = 0;

    for (const childIssue of childIssues) {
      const childStoryPoints = childIssue.fields.customfield_10002 || 0;
      const childStatus = childIssue.fields.status?.name?.toLowerCase() || "";

      if (
        childStatus.includes("done") ||
        childStatus.includes("closed") ||
        childStatus.includes("resolved")
      ) {
        completedStoryPoints += childStoryPoints;
      }

      // Check if issue was added after epic creation
      const childCreatedDate = new Date(childIssue.fields.created || "");
      // You might want to compare with sprint start date here
      addedStoryPoints += childStoryPoints;
    }

    return {
      original: originalStoryPoints,
      added: addedStoryPoints,
      completed: completedStoryPoints,
      total: originalStoryPoints + addedStoryPoints,
    };
  } catch (error) {
    console.error(`Error calculating story points for epic ${epicKey}:`, error);
    return {
      original: epicStoryPoints,
      added: 0,
      completed: 0,
      total: epicStoryPoints,
    };
  }
}

function formatStoryPoints(storyPoints: {
  original: number;
  added: number;
  completed: number;
  total: number;
}): string {
  const { original, added, completed } = storyPoints;

  const originalStoryPoints = original;
  const addedStoryPoints = added > 0 ? `(+${added}SP)` : "";
  const completedStoryPoints = completed;

  return `(${originalStoryPoints}SP ${addedStoryPoints}/ ${originalStoryPoints}SP / ${completedStoryPoints}SP)`;
}

function formatRaid(raid: {
  risks: string[];
  assumptions: string[];
  issues: string[];
  dependencies: string[];
}): string {
  const allRaidItems = [
    ...raid.risks.map((risk) => `Risk - ${risk}`),
    ...raid.assumptions.map((assumption) => `Assumption - ${assumption}`),
    ...raid.issues.map((issue) => `Issue - ${issue}`),
    ...raid.dependencies.map((dependency) => `Dependency - ${dependency}`),
  ];

  return allRaidItems.join("; ");
}
