import { CandidateClause } from '../contracts/clause';
import { normalizeText } from './normalizer';

/**
 * Segments normalized text into discrete candidate clauses.
 * Identifies formal section headings or paragraph boundaries.
 */
export function segmentClauses(rawInput: string): CandidateClause[] {
  const normalized = normalizeText(rawInput);
  if (!normalized) return [];

  // Pattern matching standard agreement headings:
  // e.g., "1. MEMBERSHIP TERM", "Section 4. CANCELLATION", "Article II - BILLING", "Paragraph 3:"
  const headingRegex = /(?:^|\n\n)(?:(?:SECTION|Section|ARTICLE|Article|Paragraph|PARAGRAPH)\s+[\dIVXLC]+[.:\s-]*[^\n]*|\d{1,3}\.[ \t]+[^\n]+)/g;

  const matches = [...normalized.matchAll(headingRegex)];

  if (matches.length > 1) {
    const clauses: CandidateClause[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const startIdx = match.index!;
      const endIdx = i < matches.length - 1 ? matches[i + 1].index! : normalized.length;

      const rawChunk = normalized.slice(startIdx, endIdx).trim();
      const firstLineBreak = rawChunk.indexOf('\n');

      let heading = '';
      let clauseBody = '';

      if (firstLineBreak !== -1) {
        heading = rawChunk.slice(0, firstLineBreak).trim();
        clauseBody = rawChunk.slice(firstLineBreak).trim();
      } else {
        heading = rawChunk;
        clauseBody = rawChunk;
      }

      clauses.push({
        id: `clause-${(i + 1).toString().padStart(2, '0')}`,
        clauseNumber: i + 1,
        heading: heading || `Clause ${i + 1}`,
        rawText: clauseBody || heading,
        charStart: startIdx,
        charEnd: endIdx,
      });
    }

    return clauses;
  }

  // Fallback: Segment by double line breaks (paragraphs)
  const paragraphs = normalized
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20); // filter out empty or micro fragments

  if (paragraphs.length === 0 && normalized.length > 0) {
    return [
      {
        id: 'clause-01',
        clauseNumber: 1,
        heading: 'Agreement Terms',
        rawText: normalized,
        charStart: 0,
        charEnd: normalized.length,
      },
    ];
  }

  return paragraphs.map((p, idx) => {
    const firstLine = p.split('\n')[0].slice(0, 60);
    const heading = firstLine.length < 50 ? firstLine : `Section ${idx + 1}`;

    return {
      id: `clause-${(idx + 1).toString().padStart(2, '0')}`,
      clauseNumber: idx + 1,
      heading,
      rawText: p,
      charStart: 0,
      charEnd: p.length,
    };
  });
}
