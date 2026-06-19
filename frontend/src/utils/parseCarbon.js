/**
 * Extracts and parses hidden carbon footprint data comment blocks in assistant replies.
 * Format: <!-- carbon-data: {"total":4.7,"categories":{"travel":2.1,"diet":1.3,...},"tips":[]} -->
 * 
 * @param {string} content - Raw message string from the assistant
 * @returns {{ cleanedContent: string, carbonData: Object|null }} Cleaned text content and parsed data object
 */
export function parseCarbonData(content) {
  if (!content || typeof content !== 'string') {
    return { cleanedContent: content, carbonData: null };
  }

  // Regex to match <!-- carbon-data: {JSON} --> across multiple lines if needed
  const regex = /<!--\s*carbon-data:\s*(\{[\s\S]*?\})\s*-->/;
  const match = content.match(regex);

  if (match) {
    try {
      const carbonData = JSON.parse(match[1]);
      const cleanedContent = content.replace(regex, '').trim();
      return { cleanedContent, carbonData };
    } catch (error) {
      console.error('Error parsing carbon-data comment block:', error);
    }
  }

  return { cleanedContent: content, carbonData: null };
}
