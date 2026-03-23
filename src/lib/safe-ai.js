// Remove personal identifiers before sending to AI APIs (EU AI Act compliance)
export function removePersonalData(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'Student')
    .replace(/\b[A-Z][a-z]+\b(?=\s+(?:struggles|has|needs|improved|learned))/gi, 'Student')
    .replace(/\b(?:Suvi|Pavel|Amira|Fatuma|Li)\b/gi, 'Student')
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[email]');
}
