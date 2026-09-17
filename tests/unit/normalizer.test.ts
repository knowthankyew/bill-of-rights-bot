import { describe, it, expect } from 'vitest';
import { normalizeText } from '../../src/core/normalizer';

describe('normalizer', () => {
  it('handles empty or null strings safely', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null as unknown as string)).toBe('');
  });

  it('normalizes smart/curly quotes and dashes', () => {
    const raw = '“Cancel your subscription” with ‘immediate’ notice — see section 4.';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('"Cancel your subscription" with \'immediate\' notice - see section 4.');
  });

  it('unifies unicode whitespace and collapses duplicate spaces', () => {
    const raw = 'Terms\u00A0of   Service\u200B   Agreement';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('Terms of Service Agreement');
  });

  it('standardizes Windows CRLF to LF and collapses excessive blank lines', () => {
    const raw = 'Line 1\r\n\r\n\r\n\r\nLine 2\r\nLine 3';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('Line 1\n\nLine 2\nLine 3');
  });
});
