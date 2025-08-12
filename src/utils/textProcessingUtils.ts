/**
 * Text processing utilities matching Python implementation
 */

/**
 * Extract and process dates in text (Python equivalent)
 * Python: def extract_and_process_dates(text):
 */
export function extractAndProcessDates(text: string): string {
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
  const visited: Record<string, boolean> = {};
  const todayDate = new Date();
  
  return text.replace(datePattern, (match) => {
    if (visited[match]) {
      return match;
    }
    
    visited[match] = true;
    
    try {
      const [day, month, year] = match.split('/');
      const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (extractedDate <= todayDate) {
        const diffDays = Math.floor((todayDate.getTime() - extractedDate.getTime()) / (1000 * 60 * 60 * 24));
        
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
 * Get list of radius comments (Python equivalent)
 * Python: def get_list_radii_comments(macro_start_value, macro_end_value, current_sprint_objective_header_html, epic_additional_comments):
 */
export function getListRadiusComments(
  macroStartValue: string,
  macroEndValue: string,
  currentSprintObjectiveHeaderHtml: string,
  epicAdditionalComments: Record<string, string>
): string {
  let currentSprintObjectiveListHtml = "<ul>";
  let currentSprintObjectiveHtml = '';
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
  currentSprintObjectiveHtml += currentSprintObjectiveHeaderHtml + currentSprintObjectiveListHtml;
  
  return currentSprintObjectiveHtml;
}

/**
 * Safe get field value (Python equivalent)
 * Python: def safe_get_field_value(field):
 */
export function safeGetFieldValue(field: any): any {
  try {
    return field;
  } catch {
    return null;
  }
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