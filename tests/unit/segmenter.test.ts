import { describe, it, expect } from 'vitest';
import { segmentClauses } from '../../src/core/segmenter';

describe('segmenter', () => {
  it('returns empty array on empty input', () => {
    expect(segmentClauses('')).toEqual([]);
    expect(segmentClauses('   ')).toEqual([]);
  });

  it('segments formal numbered agreement sections', () => {
    const sample = `
1. MEMBERSHIP TERM & AUTOMATIC RENEWAL
Your membership continues for 12 months and automatically renews.

2. CANCELLATION PROCEDURE
You must call 1-800-555-0199 to cancel your account.

3. REFUND POLICY
All fees are non-refundable upon renewal.
`;

    const clauses = segmentClauses(sample);
    expect(clauses.length).toBe(3);
    expect(clauses[0].heading).toContain('1. MEMBERSHIP TERM');
    expect(clauses[1].heading).toContain('2. CANCELLATION PROCEDURE');
    expect(clauses[2].heading).toContain('3. REFUND POLICY');
  });

  it('segments sections with "Section X." format', () => {
    const sample = `
Section 1. SUBSCRIPTION
The agreement renews monthly.

Section 2. TERMINATION
Cancellations cannot be processed online.
`;

    const clauses = segmentClauses(sample);
    expect(clauses.length).toBe(2);
    expect(clauses[0].heading).toContain('Section 1');
    expect(clauses[1].heading).toContain('Section 2');
  });

  it('falls back gracefully to paragraph splitting for unstructured text', () => {
    const sample = `
First paragraph describing the general terms of service for the platform. It has enough length to qualify as a clause.

Second paragraph explaining that you must contact customer service by calling us to cancel your subscription.

Third paragraph noting that prices may change at any time without advance notice.
`;

    const clauses = segmentClauses(sample);
    expect(clauses.length).toBe(3);
    expect(clauses[1].rawText).toContain('contact customer service by calling us');
  });
});
