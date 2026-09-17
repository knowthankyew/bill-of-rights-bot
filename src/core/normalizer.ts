/**
 * Normalizes text input for legal clause evaluation.
 * Strips formatting artifacts, normalizes typography, and unifies whitespace.
 */
export function normalizeText(input: string): string {
  if (!input) return '';

  return input
    // Replace non-breaking spaces and zero-width spaces
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Normalize unicode quotation marks
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Normalize dashes and hyphens
    .replace(/[\u2013\u2014\u2015]/g, '-')
    // Standardize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse multi-spaces within lines while preserving newlines
    .replace(/[ \t]+/g, ' ')
    // Collapse more than two consecutive newlines to two
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
