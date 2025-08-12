import { Gitlab } from "@gitbeaker/node";
import { endOfDay, startOfDay, format, getWeek, getMonth } from "date-fns";
import {
  MergeRequestsHeatmapOptions,
  UserMergeRequestStats,
  MergeRequestsHeatmapResult,
  PushDetail,
  DailyContributions,
  ContributionRecord,
  DateString,
  MergeRequestDetail,
  TeamMetrics,
  ContributionTrends,
  MergeRequestStatus,
  MergeRequestAnalytics,
  GitLabConnectionTestResult,
} from "../types/mergeRequests";

// Define your own project interface:
interface GitLabProject {
  id: number;
  name?: string;
  path?: string;
  default_branch?: string;
  [key: string]: any;
}

type GitlabApiInstance = InstanceType<typeof Gitlab>;


function convertToSafeString(unknownValue: unknown): string {
  return typeof unknownValue === "string" ? unknownValue : String(unknownValue);
}

function safeProjectName(project: any): string {
  return project?.name || project?.path || "unknown";
}

async function fetchGroupUserMapping(
  gitlabApi: GitlabApiInstance,
  groupId: string
): Promise<Map<string, string>> {
  const usernameToDisplayNameMapping = new Map<string, string>();
  const groupMembers = await gitlabApi.GroupMembers.all(groupId); // No casting needed

  for (const currentMember of groupMembers) {
    if (currentMember.name && currentMember.username) {
      usernameToDisplayNameMapping.set(
        currentMember.username.toLowerCase(),
        currentMember.name
      );
    }
  }

  return usernameToDisplayNameMapping;
}

function calculateUserContributionScore(
  userStats: UserMergeRequestStats
): number {
  return (
    userStats.commits * 2 + // Each commit worth 2 points
    userStats.mergeRequests * 3 + // Each MR worth 3 points
    userStats.approvals * 1 + // Each approval worth 1 point
    userStats.comments * 0.5 // Each comment worth 0.5 points
  );
}
function calculateTeamPerformanceMetrics(
  mergeRequestDetailsList: MergeRequestDetail[]
): TeamMetrics {
  const totalMergeRequestsCount = mergeRequestDetailsList.length;
  if (totalMergeRequestsCount === 0) {
    return {
      averageReviewTime: 0,
      mergeSuccessRate: 0,
      reviewParticipation: 0,
      codeChurnRate: 0,
    };
  }

  const successfullyMergedMRsCount = mergeRequestDetailsList.filter(
    (mergeRequest) => mergeRequest.state === "merged"
  ).length;
  const reviewTimesInHours = mergeRequestDetailsList
    .filter((mergeRequest) => mergeRequest.review_time !== undefined)
    .map((mergeRequest) => mergeRequest.review_time!);

  const averageReviewTimeInHours =
    reviewTimesInHours.length > 0
      ? reviewTimesInHours.reduce(
          (totalTime, currentTime) => totalTime + currentTime,
          0
        ) / reviewTimesInHours.length
      : 0;

  const mergeRequestsWithReviewersCount = mergeRequestDetailsList.filter(
    (mergeRequest) => mergeRequest.reviewers.length > 0
  ).length;
  const reviewParticipationRate =
    mergeRequestsWithReviewersCount / totalMergeRequestsCount;

  // Code churn rate: (insertions + deletions) / number of MRs
  const totalCodeChurnAcrossAllMRs = mergeRequestDetailsList.reduce(
    (accumulatedChurn, mergeRequest) =>
      accumulatedChurn + (mergeRequest.size || 0),
    0
  );
  const averageCodeChurnRate =
    totalCodeChurnAcrossAllMRs / totalMergeRequestsCount;

  return {
    averageReviewTime: averageReviewTimeInHours,
    mergeSuccessRate:
      (successfullyMergedMRsCount / totalMergeRequestsCount) * 100,
    reviewParticipation: reviewParticipationRate * 100,
    codeChurnRate: averageCodeChurnRate,
  };
}

function analyzeContributionTrendsOverTime(
  dailyContributionsData: DailyContributions
): ContributionTrends {
  const dailyTrendSummary: Record<DateString, number> = {};
  const weeklyTrendSummary: Record<DateString, number> = {};
  const monthlyTrendSummary: Record<DateString, number> = {};

  // Sort dates chronologically and process each day
  const sortedContributionDates = Object.keys(dailyContributionsData).sort();

  for (const currentDate of sortedContributionDates) {
    const totalContributionsForDay = Object.values(
      dailyContributionsData[currentDate]
    ).reduce((dailySum, contributionCount) => dailySum + contributionCount, 0);

    dailyTrendSummary[currentDate] = totalContributionsForDay;

    const dateObject = new Date(currentDate);
    const weekIdentifier = `${dateObject.getFullYear()}-W${getWeek(
      dateObject
    )}`;
    const monthIdentifier = `${dateObject.getFullYear()}-${
      getMonth(dateObject) + 1
    }`;

    weeklyTrendSummary[weekIdentifier] =
      (weeklyTrendSummary[weekIdentifier] || 0) + totalContributionsForDay;
    monthlyTrendSummary[monthIdentifier] =
      (monthlyTrendSummary[monthIdentifier] || 0) + totalContributionsForDay;
  }

  return {
    daily: dailyTrendSummary,
    weekly: weeklyTrendSummary,
    monthly: monthlyTrendSummary,
  };
}

function initializeEmptyContributionRecord(): ContributionRecord {
  return Object.create(null) as ContributionRecord;
}
// Helper functions for name matching and similarity analysis
function normalizeNameForComparison(inputName: string): string {
  return inputName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractNameComponents(fullName: string): string[] {
  return fullName.toLowerCase().split(/\W+/).filter(Boolean);
}

function findBestMatchingName(
  targetName: string,
  availableNamesList: string[],
  similarityThreshold = 80
): string | undefined {
  const normalizedTargetName = normalizeNameForComparison(targetName);
  const targetNameComponents = extractNameComponents(targetName);

  let bestMatchingName: string | undefined;
  let highestSimilarityScore = 0;

  for (const candidateFullName of availableNamesList) {
    const normalizedCandidateName =
      normalizeNameForComparison(candidateFullName);
    const candidateNameComponents = extractNameComponents(candidateFullName);

    // Check for exact match after normalization
    if (normalizedTargetName === normalizedCandidateName) {
      return candidateFullName;
    }

    // Check if all name parts match
    const allTargetPartsMatch = targetNameComponents.every((part) =>
      candidateNameComponents.includes(part)
    );
    const allCandidatePartsMatch = candidateNameComponents.every((part) =>
      targetNameComponents.includes(part)
    );

    if (allTargetPartsMatch || allCandidatePartsMatch) {
      return candidateFullName;
    }

    // Check for substring matches
    const hasSubstringMatch =
      normalizedTargetName.includes(normalizedCandidateName) ||
      normalizedCandidateName.includes(normalizedTargetName);

    if (hasSubstringMatch) {
      const similarityScore = calculateStringSimilarityScore(
        normalizedTargetName,
        normalizedCandidateName
      );
      if (similarityScore > highestSimilarityScore) {
        highestSimilarityScore = similarityScore;
        bestMatchingName = candidateFullName;
      }
    }
  }

  // If no substring match found, try Levenshtein distance comparison
  if (!bestMatchingName) {
    for (const candidateFullName of availableNamesList) {
      const similarityScore = calculateStringSimilarityScore(
        normalizedTargetName,
        normalizeNameForComparison(candidateFullName)
      );
      if (similarityScore > highestSimilarityScore) {
        highestSimilarityScore = similarityScore;
        bestMatchingName = candidateFullName;
      }
    }
  }

  return highestSimilarityScore >= similarityThreshold
    ? bestMatchingName
    : undefined;
}

function calculateStringSimilarityScore(
  firstString: string,
  secondString: string
): number {
  const distanceMatrix = Array(secondString.length + 1)
    .fill(null)
    .map(() => Array(firstString.length + 1).fill(null));

  // Initialize first row and column
  for (let i = 0; i <= firstString.length; i += 1) {
    distanceMatrix[0][i] = i;
  }
  for (let j = 0; j <= secondString.length; j += 1) {
    distanceMatrix[j][0] = j;
  }

  // Calculate Levenshtein distance
  for (let j = 1; j <= secondString.length; j += 1) {
    for (let i = 1; i <= firstString.length; i += 1) {
      const substitutionCost =
        firstString[i - 1] === secondString[j - 1] ? 0 : 1;
      distanceMatrix[j][i] = Math.min(
        distanceMatrix[j][i - 1] + 1, // deletion
        distanceMatrix[j - 1][i] + 1, // insertion
        distanceMatrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  const maxStringLength = Math.max(firstString.length, secondString.length);
  const levenshteinDistance =
    distanceMatrix[secondString.length][firstString.length];
  return ((maxStringLength - levenshteinDistance) / maxStringLength) * 100;
}

function isAutomatedBotAccount(username: string): boolean {
  const botIdentifierKeywords = [
    "bot",
    "security",
    "system",
    "pipeline",
    "ci",
    "auto",
  ];
  return botIdentifierKeywords.some((keyword) =>
    username.toLowerCase().includes(keyword)
  );
}

function isSubstantiveComment(commentText: string): boolean {
  const trivialCommentPhrases = [
    "thank you",
    "thanks",
    "lgtm",
    "looks good",
    "good",
    "+1",
    "approved",
    "ship it",
    "merge it",
    "nice",
    "ok",
    "okay",
    "sounds good",
    "sg",
    "r+",
    "👍",
    "thumbs up",
    "approved",
  ];

  if (!commentText || commentText.trim().length < 5) {
    return false;
  }

  const normalizedCommentText = commentText.toLowerCase().trim();

  // Check if comment matches trivial phrases
  const isTrivialComment = trivialCommentPhrases.some(
    (phrase) =>
      normalizedCommentText === phrase ||
      normalizedCommentText.startsWith(phrase + " ") ||
      normalizedCommentText.endsWith(" " + phrase)
  );

  if (isTrivialComment) {
    return false;
  }

  // Check if it's a short comment without meaningful technical content
  const hasTechnicalKeywords = [
    "bug",
    "fix",
    "issue",
    "error",
    "change",
    "update",
  ].some((keyword) => normalizedCommentText.includes(keyword));

  if (normalizedCommentText.length < 15 && !hasTechnicalKeywords) {
    return false;
  }

  return true;
}
async function fetchProjectContributionData(
  gitlabApi: GitlabApiInstance,
  projectDetails: GitLabProject, // Use your interface instead of ProjectSchema
  analysisStartDate: string,
  analysisEndDate: string
): Promise<{
  contributions: DailyContributions;
  pushDetails: Record<string, PushDetail[]>;
}> {
  const dailyContributionsByUser: DailyContributions = {};
  const userPushActivityDetails: Record<string, PushDetail[]> = {};

  // Get the primary branch for the project
  const primaryBranchName = projectDetails.default_branch || "main";

  // Fetch all commits within the specified date range
  const commitsInDateRange = await gitlabApi.Commits.all(projectDetails.id, {
    since: startOfDay(new Date(analysisStartDate)).toISOString(),
    until: endOfDay(new Date(analysisEndDate)).toISOString(),
    ref_name: primaryBranchName,
  });

  for (const currentCommit of commitsInDateRange) {
    if (
      !currentCommit.author_name ||
      isAutomatedBotAccount(currentCommit.author_name)
    )
      continue;

    const commitDateString = format(
      new Date(currentCommit.created_at),
      "yyyy-MM-dd"
    );
    const authorUsernameNormalized = currentCommit.author_name.toLowerCase();

    // Initialize daily contribution tracking if needed
    if (!dailyContributionsByUser[commitDateString]) {
      dailyContributionsByUser[commitDateString] =
        initializeEmptyContributionRecord();
    }
    dailyContributionsByUser[commitDateString][authorUsernameNormalized] =
      (dailyContributionsByUser[commitDateString][authorUsernameNormalized] ||
        0) + 1;

    // Fetch detailed commit information including diff statistics
    // Fetch detailed commit information including diff statistics
    try {
      const detailedCommitInfo = await gitlabApi.Commits.show(
        projectDetails.id,
        currentCommit.id
      );
      const commitDiffStatistics = detailedCommitInfo.stats;

      if (!userPushActivityDetails[authorUsernameNormalized]) {
        userPushActivityDetails[authorUsernameNormalized] = [];
      }

      userPushActivityDetails[authorUsernameNormalized].push({
        sha: currentCommit.id,
        message: currentCommit.message || "No message",
        date: format(
          new Date(currentCommit.created_at),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        ),
        project: safeProjectName(projectDetails),
        branch: typeof currentCommit.ref === "string" ? currentCommit.ref : undefined,
        filesChanged: undefined, // GitLab API doesn't provide this in commit stats
        insertions: commitDiffStatistics?.additions,
        deletions: commitDiffStatistics?.deletions,
      });
    } catch (commitDetailsFetchError) {
      console.error(
        `Error fetching detailed commit information for ${currentCommit.id}:`,
        commitDetailsFetchError
      );

      // Add basic commit info even if detailed fetch fails
      if (!userPushActivityDetails[authorUsernameNormalized]) {
        userPushActivityDetails[authorUsernameNormalized] = [];
      }

      userPushActivityDetails[authorUsernameNormalized].push({
        sha: currentCommit.id,
        message: currentCommit.message || "No message",
        date: format(
          new Date(currentCommit.created_at),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        ),
        project: safeProjectName(projectDetails),
      });
    }
  }

  return {
    contributions: dailyContributionsByUser,
    pushDetails: userPushActivityDetails,
  };
}
export async function getMergeRequestsHeatmap(
  options: MergeRequestsHeatmapOptions
): Promise<MergeRequestsHeatmapResult> {
  const { groupId, startDate, endDate } = options;
  const token = process.env.GITLAB_TOKEN;
  if (!token) throw new Error("GITLAB_TOKEN not set in environment");

  const gitlabApi = new Gitlab({
    token,
    host: process.env.GITLAB_HOST || "https://gitlab.com",
  });

  // Get user mapping first
  const usernameToDisplayNameMapping = await fetchGroupUserMapping(
    gitlabApi,
    groupId
  );

  // Get all projects in the group
  const groupProjects = await gitlabApi.Groups.projects(groupId, {
    perPage: 100,
  });
  const userStatisticsRecord: Record<string, UserMergeRequestStats> = {};
  let totalMergeRequestsCount = 0;
  let totalCommitsCount = 0;
  let totalApprovalsCount = 0;
  let totalCommentsCount = 0;

  // Track contributions by date
  const dailyContributionsByUser: DailyContributions = {};
  const userPushActivityDetails: Record<string, PushDetail[]> = {};
  const mergeRequestDetailsList: MergeRequestDetail[] = [];

  for (const currentProject of groupProjects) {
    // Get contribution data
    const { contributions, pushDetails } = await fetchProjectContributionData(
      gitlabApi,
      currentProject,
      startDate,
      endDate
    );

    // Merge contribution data
    for (const [contributionDate, userContributions] of Object.entries(
      contributions
    )) {
      if (!dailyContributionsByUser[contributionDate]) {
        dailyContributionsByUser[contributionDate] =
          initializeEmptyContributionRecord();
      }
      for (const [contributorUsername, contributionCount] of Object.entries(
        userContributions
      )) {
        dailyContributionsByUser[contributionDate][contributorUsername] =
          (dailyContributionsByUser[contributionDate][contributorUsername] ||
            0) + contributionCount;
      }
    }

    // Merge push details
    for (const [username, pushDetailsList] of Object.entries(pushDetails)) {
      if (!userPushActivityDetails[username]) {
        userPushActivityDetails[username] = [];
      }
      userPushActivityDetails[username].push(...pushDetailsList);
    }

    // Get all merge requests in the date range
    const projectMergeRequests = await gitlabApi.MergeRequests.all({
      projectId: currentProject.id,
      createdAfter: startOfDay(new Date(startDate)).toISOString(),
      createdBefore: endOfDay(new Date(endDate)).toISOString(),
      perPage: 100,
    });

    totalMergeRequestsCount += projectMergeRequests.length;

    for (const currentMergeRequest of projectMergeRequests) {
      const authorUsername = convertToSafeString(
        typeof currentMergeRequest.author?.username === "string"
          ? currentMergeRequest.author.username
          : "unknown"
      );
      const authorDisplayName =
        typeof currentMergeRequest.author?.name === "string"
          ? currentMergeRequest.author.name
          : authorUsername;
      const resolvedAuthorName =
        usernameToDisplayNameMapping.get(authorUsername.toLowerCase()) ||
        authorDisplayName;

      if (!userStatisticsRecord[authorUsername]) {
        userStatisticsRecord[authorUsername] = {
          username: authorUsername,
          name: String(resolvedAuthorName),
          commits: 0,
          mergeRequests: 0,
          approvals: 0,
          comments: 0,
          lastActiveDate: format(
            new Date(currentMergeRequest.created_at),
            "yyyy-MM-dd"
          ),
        };
      }
      userStatisticsRecord[authorUsername].mergeRequests++;

      // Update last active date if this MR is more recent
      const mergeRequestCreationDate = new Date(currentMergeRequest.created_at);
      const currentLastActiveDate = new Date(
        userStatisticsRecord[authorUsername].lastActiveDate!
      );
      if (mergeRequestCreationDate > currentLastActiveDate) {
        userStatisticsRecord[authorUsername].lastActiveDate = format(
          mergeRequestCreationDate,
          "yyyy-MM-dd"
        );
      }

      // Commits in MR
      const mergeRequestCommits = await gitlabApi.MergeRequests.commits(
        currentProject.id,
        currentMergeRequest.iid
      );
      userStatisticsRecord[authorUsername].commits +=
        mergeRequestCommits.length;
      totalCommitsCount += mergeRequestCommits.length;

      // Get MR details including diff stats
      try {
        const detailedMergeRequestInfo = await gitlabApi.MergeRequests.show(
          currentProject.id,
          currentMergeRequest.iid
        );
        const assignedReviewers: string[] = [];
        if (
          detailedMergeRequestInfo.reviewers &&
          Array.isArray(detailedMergeRequestInfo.reviewers)
        ) {
          for (const reviewer of detailedMergeRequestInfo.reviewers) {
            if (
              reviewer &&
              typeof reviewer === "object" &&
              "username" in reviewer &&
              typeof reviewer.username === "string"
            ) {
              assignedReviewers.push(reviewer.username);
            }
          }
        }
        const mergeRequestLabels: string[] = [];
        if (
          detailedMergeRequestInfo.labels &&
          Array.isArray(detailedMergeRequestInfo.labels)
        ) {
          for (const label of detailedMergeRequestInfo.labels) {
            if (typeof label === "string") {
              mergeRequestLabels.push(label);
            }
          }
        }
        let calculatedReviewTime = undefined;
        if (detailedMergeRequestInfo.merged_at) {
          calculatedReviewTime =
            (new Date(detailedMergeRequestInfo.merged_at).getTime() -
              new Date(currentMergeRequest.created_at).getTime()) /
            (1000 * 60 * 60);
        }

        mergeRequestDetailsList.push({
          id: currentMergeRequest.iid.toString(),
          title: currentMergeRequest.title || "",
          state: currentMergeRequest.state || "unknown",
          created_at: format(
            new Date(currentMergeRequest.created_at),
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
          ),
          updated_at: format(
            new Date(currentMergeRequest.updated_at),
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
          ),
          merged_at: currentMergeRequest.merged_at
            ? format(
                new Date(currentMergeRequest.merged_at),
                "yyyy-MM-dd'T'HH:mm:ss'Z'"
              )
            : undefined,
          closed_at: currentMergeRequest.closed_at
            ? format(
                new Date(currentMergeRequest.closed_at),
                "yyyy-MM-dd'T'HH:mm:ss'Z'"
              )
            : undefined,
          author: String(resolvedAuthorName),
          assignee:
            typeof currentMergeRequest.assignee?.username === "string"
              ? currentMergeRequest.assignee.username
              : undefined,
          reviewers: assignedReviewers,
          labels: mergeRequestLabels,
          branch:
            typeof currentMergeRequest.source_branch === "string"
              ? currentMergeRequest.source_branch
              : "unknown",
          target_branch:
            typeof currentMergeRequest.target_branch === "string"
              ? currentMergeRequest.target_branch
              : "main",
          approval_duration: currentMergeRequest.merged_at
            ? (new Date(currentMergeRequest.merged_at).getTime() -
                new Date(currentMergeRequest.created_at).getTime()) /
              (1000 * 60 * 60)
            : undefined,
          review_time: calculatedReviewTime,
          size:
            typeof detailedMergeRequestInfo.changes_count === "number"
              ? detailedMergeRequestInfo.changes_count
              : undefined,
          complexity:
            typeof detailedMergeRequestInfo.changes_count === "number" &&
            detailedMergeRequestInfo.changes_count > 0
              ? Math.log2(detailedMergeRequestInfo.changes_count)
              : undefined,
        });
      } catch (mergeRequestDetailsError) {
        console.error(
          `Error fetching MR details for ${currentMergeRequest.iid}:`,
          mergeRequestDetailsError
        );
      }

      // Process approvals
      try {
        const approvalInformation =
          await gitlabApi.MergeRequestApprovals.approvalState(
            currentProject.id,
            currentMergeRequest.iid
          );

        if (
          approvalInformation &&
          typeof approvalInformation === "object" &&
          "approved_by" in approvalInformation &&
          Array.isArray(approvalInformation.approved_by)
        ) {
          for (const approverInfo of approvalInformation.approved_by) {
            if (
              approverInfo &&
              typeof approverInfo === "object" &&
              "user" in approverInfo &&
              approverInfo.user &&
              typeof approverInfo.user === "object"
            ) {
              const user = approverInfo.user as any;
              const approverUsername = convertToSafeString(
                user.username || "unknown"
              );
              const approverDisplayName = convertToSafeString(
                user.name || approverUsername
              );
              const resolvedApproverName =
                usernameToDisplayNameMapping.get(
                  approverUsername.toLowerCase()
                ) || approverDisplayName;

              if (!userStatisticsRecord[approverUsername]) {
                userStatisticsRecord[approverUsername] = {
                  username: approverUsername,
                  name: String(resolvedApproverName),
                  commits: 0,
                  mergeRequests: 0,
                  approvals: 0,
                  comments: 0,
                  lastActiveDate: format(new Date(), "yyyy-MM-dd"),
                };
              }
              userStatisticsRecord[approverUsername].approvals++;
              totalApprovalsCount++;
            }
          }
        }
      } catch (approvalFetchError) {
        // Silently handle approval fetch errors
        console.error(
          `Error fetching approval information for MR ${currentMergeRequest.iid}:`,
          approvalFetchError
        );
      }

      // Process comments/notes
      // Process comments/notes
      try {
        const mergeRequestNotes = await gitlabApi.MergeRequestNotes.all(
          currentProject.id,
          currentMergeRequest.iid
        );

        for (const currentNote of mergeRequestNotes) {
          if (
            currentNote.author &&
            !currentNote.system &&
            !isAutomatedBotAccount(currentNote.author.username)
          ) {
            // Only count meaningful comments
            if (!isSubstantiveComment(currentNote.body)) {
              continue;
            }

            const commentAuthorUsername = convertToSafeString(
              typeof currentNote.author.username === "string"
                ? currentNote.author.username
                : "unknown"
            );
            const commentAuthorDisplayName =
              typeof currentNote.author.name === "string"
                ? currentNote.author.name
                : commentAuthorUsername;
            const resolvedCommentAuthorName =
              usernameToDisplayNameMapping.get(
                commentAuthorUsername.toLowerCase()
              ) || commentAuthorDisplayName;

            if (!userStatisticsRecord[commentAuthorUsername]) {
              userStatisticsRecord[commentAuthorUsername] = {
                username: commentAuthorUsername,
                name: String(resolvedCommentAuthorName),
                commits: 0,
                mergeRequests: 0,
                approvals: 0,
                comments: 0,
                lastActiveDate: format(
                  new Date(currentNote.created_at),
                  "yyyy-MM-dd"
                ),
              };
            }
            userStatisticsRecord[commentAuthorUsername].comments++;
            totalCommentsCount++;

            // Update last active date if this comment is more recent
            const commentCreationDate = new Date(currentNote.created_at);
            const currentLastActiveDate = new Date(
              userStatisticsRecord[commentAuthorUsername].lastActiveDate!
            );
            if (commentCreationDate > currentLastActiveDate) {
              userStatisticsRecord[commentAuthorUsername].lastActiveDate =
                format(commentCreationDate, "yyyy-MM-dd");
            }
          }
        }
      } catch (notesFetchError) {
        console.error(
          `Error fetching notes for MR ${currentMergeRequest.iid}:`,
          notesFetchError
        );
      }
    }
  }

  // Calculate contribution scores for all users
  for (const userStats of Object.values(userStatisticsRecord)) {
    userStats.contributionScore = calculateUserContributionScore(userStats);
  }

  // Calculate contribution trends over time
  const contributionTrendsAnalysis = analyzeContributionTrendsOverTime(
    dailyContributionsByUser
  );

  // Calculate team performance metrics
  const teamPerformanceMetrics = calculateTeamPerformanceMetrics(
    mergeRequestDetailsList
  );

  return {
    users: Object.values(userStatisticsRecord),
    totalMergeRequests: totalMergeRequestsCount,
    totalCommits: totalCommitsCount,
    totalApprovals: totalApprovalsCount,
    totalComments: totalCommentsCount,
    dailyContributions: dailyContributionsByUser,
    userPushDetails: userPushActivityDetails,
    contributionTrends: contributionTrendsAnalysis,
    teamMetrics: teamPerformanceMetrics,
  };
}

export async function getMergeRequestsAnalytics(
  options: MergeRequestsHeatmapOptions
): Promise<MergeRequestAnalytics[]> {
  const { groupId, startDate, endDate } = options;
  const token = process.env.GITLAB_TOKEN;
  if (!token) throw new Error("GITLAB_TOKEN not set in environment");

  const gitlabApi = new Gitlab({
    token,
    host: process.env.GITLAB_HOST || "https://gitlab.com",
  });

  // Get all projects in the group
  const groupProjects = await gitlabApi.Groups.projects(groupId, {
    perPage: 100,
  });
  const analyticsResults: MergeRequestAnalytics[] = [];

  for (const currentProject of groupProjects) {
    // Get all merge requests in the date range
    const projectMergeRequests = await gitlabApi.MergeRequests.all({
      projectId: currentProject.id,
      createdAfter: startOfDay(new Date(startDate)).toISOString(),
      createdBefore: endOfDay(new Date(endDate)).toISOString(),
      perPage: 100,
    });

    for (const currentMergeRequest of projectMergeRequests) {
      // Safe author name extraction
      const authorName = currentMergeRequest.author?.name
        ? String(currentMergeRequest.author.name)
        : "Unknown";

      const creationTimestamp = format(
        new Date(currentMergeRequest.created_at),
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );
      const lastUpdateTimestamp = format(
        new Date(currentMergeRequest.updated_at),
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      let approvalDurationInHours: number | null = null;
      if (
        currentMergeRequest.state === "merged" &&
        currentMergeRequest.merged_at
      ) {
        approvalDurationInHours =
          (new Date(currentMergeRequest.merged_at).getTime() -
            new Date(currentMergeRequest.created_at).getTime()) /
          (1000 * 60 * 60);
      }

      // Calculate time from last commit to merge
      let lastCommitToMergeDuration: number | null = null;
      try {
        const mergeRequestCommits = await gitlabApi.MergeRequests.commits(
          currentProject.id,
          currentMergeRequest.iid
        );
        if (mergeRequestCommits && mergeRequestCommits.length > 0) {
          const firstCommit = mergeRequestCommits[0];
          if (firstCommit?.created_at) {
            const lastCommitTimestamp = new Date(firstCommit.created_at);
            lastCommitToMergeDuration =
              (new Date(lastUpdateTimestamp).getTime() -
                lastCommitTimestamp.getTime()) /
              (1000 * 60 * 60);
          }
        }
      } catch (commitFetchError) {
        console.error(
          `Error fetching commits for MR ${currentMergeRequest.iid}:`,
          commitFetchError
        );
      }

      analyticsResults.push({
        id: currentMergeRequest.iid,
        status: currentMergeRequest.state as MergeRequestStatus,
        title: currentMergeRequest.title || "Untitled",
        author: authorName,
        created_at: creationTimestamp,
        updated_at: lastUpdateTimestamp,
        project: safeProjectName(currentProject),
        approval_duration: approvalDurationInHours,
        last_commit_to_merge: lastCommitToMergeDuration,
      });
    }
  }

  return analyticsResults;
}

export async function testGitlabConnection(): Promise<GitLabConnectionTestResult> {
  const token = process.env.GITLAB_TOKEN;
  const host = process.env.GITLAB_HOST || "https://gitlab.com";

  if (!token) {
    return { status: "error", message: "Missing GitLab token" };
  }

  try {
    const gitlabApi = new Gitlab({ token, host });
    const currentUser = await gitlabApi.Users.current();
    return {
      status: "success",
      message: "Connected to GitLab successfully",
      user: {
        username: currentUser.username,
        name: currentUser.name,
        id: currentUser.id,
      },
    };
  } catch (connectionError: any) {
    return { status: "error", message: connectionError.message };
  }
}
