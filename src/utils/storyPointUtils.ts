import { JiraIssue } from '../types/jira';

export interface StoryPointBreakdown {
  total: number;
  completed: number;
  inProgress: number;
  toDo: number;
}

export interface StoryPointStatus {
  completed: number;
  inProgress: number;
  toDo: number;
}

export const STORY_POINT_STATUSES = {
  completed: ['Done', 'Closed', 'Resolved'],
  inProgress: ['In Progress', 'In Development'],
  toDo: ['To Do', 'Open', 'New']
} as const;

/**
 * Process story points to match Python logic exactly
 * Python: def process_story_points(story_points):
 *     if story_points % 1 == 0:
 *         story_points = int(story_points)
 *     return story_points
 */
export function processStoryPoints(storyPoints: number | undefined): number {
  if (storyPoints === undefined || storyPoints === null) {
    return 0;
  }
  if (storyPoints % 1 === 0) {
    return Math.floor(storyPoints);
  }
  return storyPoints;
}

/**
 * Update story points logic matching Python implementation
 * Python: def update_story_points(child_key, child_status, issue, parent_key, snc_issues, project_sprints, sprint):
 */
interface StoryPointIssueFields {
  customfield_10002?: number;
  status?: { name?: string };
  parent?: { key?: string };
  customfield_10341?: Array<{ id: number; state: string }>;
  created?: string;
  assignee?: { accountId?: string };
}

interface StoryPointIssue {
  key: string;
  fields: StoryPointIssueFields;
}

export function updateStoryPoints(
  issue: StoryPointIssue,
  projectSprints: number[],
  sprint?: number
): {
  storyPoints: number;
  shouldInclude: boolean;
  childKey: string;
  childStatus: string;
  parentKey: string;
} {
  // Get story points with fallback to 5 (Python equivalent)
  let storyPoints = issue.fields?.customfield_10002 || 5;
  storyPoints = storyPoints >= 0 ? storyPoints : 5;
  
  // Process story points (Python equivalent)
  storyPoints = processStoryPoints(storyPoints);
  
  const childKey = issue.key;
  const childStatus = issue.fields?.status?.name || '';
  const parentKey = issue.fields?.parent?.key || '';
  
  let shouldInclude = false;
  
  if (sprint === undefined) {
    // No specific sprint - check if issue belongs to current PI
    let nextPi = false;
    const sprintField = issue.fields?.customfield_10341;
    
    if (sprintField) {
      for (const sprintItem of sprintField) {
        if (!projectSprints.includes(sprintItem.id) && 
            (sprintItem.state === 'active' || sprintItem.state === 'future')) {
          nextPi = true;
          break;
        }
      }
    }
    
    if (!nextPi) {
      shouldInclude = true;
    }
  } else {
    // Specific sprint - check if issue belongs to this sprint
    const sprintField = issue.fields?.customfield_10341;
    if (sprintField) {
      const sprintIds = sprintField.map((s: { id: number }) => s.id).filter((id: number) => id !== undefined);
      if (sprintIds.length > 0) {
        const maxSprintId = Math.max(...sprintIds);
        
        if (projectSprints.includes(maxSprintId) && maxSprintId === sprint) {
          shouldInclude = true;
        }
      }
    }
  }
  
  return {
    storyPoints,
    shouldInclude,
    childKey,
    childStatus,
    parentKey
  };
}

/**
 * Get story point breakdown for a single issue
 */
export function getIssueStoryPointBreakdown(issue: JiraIssue): StoryPointStatus {
  const storyPoints = processStoryPoints(issue.fields.customfield_10002);
  const status = (issue.fields.status?.name || '').toLowerCase();
  
  const completed = STORY_POINT_STATUSES.completed.map(statusItem => statusItem.toLowerCase()).includes(status) ? storyPoints : 0;
  const inProgress = STORY_POINT_STATUSES.inProgress.map(statusItem => statusItem.toLowerCase()).includes(status) ? storyPoints : 0;
  const toDo = STORY_POINT_STATUSES.toDo.map(statusItem => statusItem.toLowerCase()).includes(status) ? storyPoints : 0;
  
  return { completed, inProgress, toDo };
}

/**
 * Calculate story point breakdown for a collection of issues
 */
export function calculateStoryPointBreakdown(issues: JiraIssue[]): StoryPointBreakdown {
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let toDo = 0;

  for (const issue of issues) {
    const storyPoints = processStoryPoints(issue.fields.customfield_10002);
    total += storyPoints;
    
    const breakdown = getIssueStoryPointBreakdown(issue);
    completed += breakdown.completed;
    inProgress += breakdown.inProgress;
    toDo += breakdown.toDo;
  }

  return { total, completed, inProgress, toDo };
}

/**
 * Calculate story point breakdown grouped by a key function
 */
export function calculateGroupedStoryPointBreakdown<T>(
  issues: JiraIssue[],
  groupKey: (issue: JiraIssue) => T
): Map<T, StoryPointBreakdown> {
  const groupedBreakdown = new Map<T, StoryPointBreakdown>();

  for (const issue of issues) {
    const groupKeyValue = groupKey(issue);
    const storyPoints = processStoryPoints(issue.fields.customfield_10002);
    const issueBreakdown = getIssueStoryPointBreakdown(issue);

    if (!groupedBreakdown.has(groupKeyValue)) {
      groupedBreakdown.set(groupKeyValue, { total: 0, completed: 0, inProgress: 0, toDo: 0 });
    }

    const currentBreakdown = groupedBreakdown.get(groupKeyValue)!;
    currentBreakdown.total += storyPoints;
    currentBreakdown.completed += issueBreakdown.completed;
    currentBreakdown.inProgress += issueBreakdown.inProgress;
    currentBreakdown.toDo += issueBreakdown.toDo;
  }

  return groupedBreakdown;
}

/**
 * Calculate RAG status based on completion percentage
 */
export function calculateRagStatus(completed: number, total: number): string {
  if (total === 0) return 'Red';
  
  const percentage = (completed / total) * 100;
  if (percentage > 90) return 'Green';
  if (percentage >= 80) return 'Amber';
  return 'Red';
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Get sprint ID from issue's sprint field
 */
export function getSprintIdFromIssue(issue: JiraIssue): string | null {
  const sprintArr = issue.fields.customfield_10341 || [];
  return sprintArr.length > 0 ? sprintArr[sprintArr.length - 1]?.id?.toString() || null : null;
}

/**
 * Extract and process dates from text (Python equivalent)
 * Python: def extract_and_process_dates(text):
 */
export function extractAndProcessDates(text: string): string {
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
  const today = new Date();
  const visited = new Set<string>();
  
  return text.replace(datePattern, (match) => {
    if (visited.has(match)) {
      return match;
    }
    visited.add(match);
    
    try {
      const [day, month, year] = match.split('/');
      const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const diffDays = Math.floor((today.getTime() - extractedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (extractedDate <= today) {
        if (diffDays <= 5) {
          return `<ac:structured-macro ac:name="status" ac:schema-version="1" ac:macro-id="75ea0f34-aa09-4889-82ba-84f65564ab4e"><ac:parameter ac:name="title">${match}</ac:parameter><ac:parameter ac:name="colour">Yellow</ac:parameter></ac:structured-macro>`;
        } else {
          return `<ac:structured-macro ac:name="status" ac:schema-version="1" ac:macro-id="a04f2063-3a8b-485b-9448-93c9b1d580f9"><ac:parameter ac:name="title">${match}</ac:parameter><ac:parameter ac:name="colour">Red</ac:parameter></ac:structured-macro>`;
        }
      } else {
        return `<ac:structured-macro ac:name="status" ac:schema-version="1" ac:macro-id="bec78396-690d-44dc-a599-25aa2d281fca"><ac:parameter ac:name="title">${match}</ac:parameter><ac:parameter ac:name="colour">Blue</ac:parameter></ac:structured-macro>`;
      }
    } catch (error) {
      return match;
    }
  });
}

/**
 * Get list radius comments (Python equivalent)
 * Python: def get_list_radii_comments(macro_start_value, macro_end_value, current_sprint_objective_header_html, epic_additional_comments):
 */
export function getListRadiusComments(
  macroStartValue: string,
  macroEndValue: string,
  currentSprintObjectiveHeaderHtml: string,
  epicAdditionalComments: Record<string, string>
): string {
  let currentSprintObjectiveListHtml = "<ul>";
  let comments = '';
  
  for (const [epic, epicComment] of Object.entries(epicAdditionalComments)) {
    const formattedComment = epicComment.replace(/\n/g, '<br/>');
    if (formattedComment !== '') {
      comments += '<li><p>';
      comments += macroStartValue + epic + macroEndValue + ": " + formattedComment;
      comments += '</p></li>';
    }
  }
  
  currentSprintObjectiveListHtml += comments;
  currentSprintObjectiveListHtml += '</ul>';
  currentSprintObjectiveListHtml += '</ac:layout-cell>';
  
  return currentSprintObjectiveHeaderHtml + currentSprintObjectiveListHtml;
}

/**
 * Safe get field value (Python equivalent)
 * Python: def safe_get_field_value(field):
 */
export function safeGetFieldValue(field: unknown): unknown {
  if (field === null || field === undefined) {
    return null;
  }
  
  if (typeof field === 'object' && field !== null && 'value' in field) {
    return (field as { value: unknown }).value;
  }
  
  return field;
}

/**
 * Calculate position score (Python equivalent)
 * Python: def calculate_position_score(positions, total_words):
 */
export function calculatePositionScore(positions: number[], totalWords: number): number {
  if (positions.length === 0) {
    return 0;
  }
  
  const positionScores = positions.map(pos => 1 - (pos / totalWords));
  return positionScores.reduce((sum, score) => sum + score, 0) / positionScores.length;
}

/**
 * Calculate phrase importance (Python equivalent)
 * Python: def calculate_phrase_importance(phrase, word_positions, total_words, word_frequencies, word_scores):
 */
export function calculatePhraseImportance(
  phrase: string,
  wordPositions: Record<string, number[]>,
  totalWords: number,
  wordFrequencies: Record<string, number>,
  wordScores: Record<string, number>
): number {
  const words = phrase.toLowerCase().split(' ');
  
  // Position score
  const positions: number[] = [];
  for (const word of words) {
    if (wordPositions[word]) {
      positions.push(...wordPositions[word]);
    }
  }
  const positionScore = calculatePositionScore(positions, totalWords);
  
  // Frequency score
  const freqScore = words.reduce((sum, word) => sum + (wordFrequencies[word] || 0), 0) / words.length;
  
  // TextRank score
  const textrankScore = words.reduce((sum, word) => sum + (wordScores[word] || 0), 0) / words.length;
  
  // Length score - favor longer complete phrases
  const lengthScore = Math.min(words.length / 4, 1.0);
  
  // Combine scores with adjusted weights to favor frequency and length
  const finalScore = (
    0.30 * textrankScore +
    0.25 * positionScore +
    0.30 * freqScore +  // Increased weight for frequency
    0.15 * lengthScore  // Increased weight for length
  );
  
  return finalScore;
}

/**
 * Check if phrases overlap (Python equivalent)
 * Python: def has_overlap(phrase1, phrase2):
 */
export function hasOverlap(phrase1: string, phrase2: string): boolean {
  const words1 = phrase1.toLowerCase().split(' ');
  const words2 = phrase2.toLowerCase().split(' ');
  
  // Check if one is a subphrase of the other
  for (let i = 0; i <= words1.length - words2.length; i++) {
    if (words1.slice(i, i + words2.length).join(' ') === words2.join(' ')) {
      return true;
    }
  }
  
  for (let i = 0; i <= words2.length - words1.length; i++) {
    if (words2.slice(i, i + words1.length).join(' ') === words1.join(' ')) {
      return true;
    }
  }
  
  // Check for any shared words in similar positions
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length > 0;
}

/**
 * Get epic key from issue
 */
export function getEpicKeyFromIssue(issue: JiraIssue): string {
  return issue.fields.parent?.key || 'No Epic';
}

/**
 * Calculate added story points (issues created after a specific date)
 */
export function calculateAddedStoryPoints(issues: JiraIssue[], afterDate: Date): number {
  let totalAddedStoryPoints = 0;
  
  for (const issue of issues) {
    const issueCreatedDate = new Date(issue.fields.created || '');
    if (issueCreatedDate > afterDate) {
      totalAddedStoryPoints += processStoryPoints(issue.fields.customfield_10002);
    }
  }
  
  return totalAddedStoryPoints;
}

/**
 * Calculate team members count from issues
 */
export function calculateTeamMembersCount(issues: JiraIssue[]): number {
  const uniqueAssigneeIds = new Set(
    issues
      .map(issue => issue.fields.assignee?.accountId)
      .filter((assigneeId): assigneeId is string => Boolean(assigneeId))
  );
  return uniqueAssigneeIds.size || 15; // Default to 15 if no team members found
} 