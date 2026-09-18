import { describe, it, expect } from 'vitest';
import { evaluateAgreement, evaluateSingleClause, STATUTE_CATALOG } from '../../src/core/rule-engine';
import { CandidateClause } from '../../src/contracts/clause';

describe('rule-engine', () => {
  const ftcRules = STATUTE_CATALOG.FTC.rules;

  it('flags phone-only cancellation as Unlawful under ROSCA and FTC Act § 5', () => {
    const clause: CandidateClause = {
      id: 'c1',
      clauseNumber: 1,
      heading: '4. CANCELLATION',
      rawText: 'To cancel your membership, you must call 1-800-555-0199. Cancellations are not accepted online.',
      charStart: 0,
      charEnd: 100,
    };

    const evaluated = evaluateSingleClause(clause, ftcRules);
    expect(evaluated.severity).toBe('Unlawful');
    expect(evaluated.category).toBe('AsymmetricCancellation');
    expect(evaluated.statutoryCitation).toContain('ROSCA, 15 U.S.C. § 8403(3)');
    expect(evaluated.matchedSnippet).toBeDefined();
  });

  it('respects negative exceptions when online cancellation is offered', () => {
    const clause: CandidateClause = {
      id: 'c2',
      clauseNumber: 2,
      heading: 'CANCELLATION OPTIONS',
      rawText: 'You may call us to cancel, or cancel online at any time via your account settings.',
      charStart: 0,
      charEnd: 100,
    };

    const evaluated = evaluateSingleClause(clause, ftcRules);
    expect(evaluated.severity).toBe('Standard');
    expect(evaluated.matchedRuleId).toBeUndefined();
  });

  it('flags mandatory exit interviews and retention mazes as Watch under FTC Act § 5 / ROSCA', () => {
    const clause: CandidateClause = {
      id: 'c3',
      clauseNumber: 3,
      heading: 'OFFBOARDING',
      rawText: 'Before cancelling, you must speak with our retention specialist and complete an exit interview.',
      charStart: 0,
      charEnd: 100,
    };

    const evaluated = evaluateSingleClause(clause, ftcRules);
    expect(evaluated.severity).toBe('Watch');
    expect(evaluated.category).toBe('RetentionMaze');
    expect(evaluated.statutoryCitation).toContain('FTC Act § 5(a)');
  });

  it('flags unilateral price escalation without notice as Watch', () => {
    const clause: CandidateClause = {
      id: 'c4',
      clauseNumber: 4,
      heading: 'FEES',
      rawText: 'The company reserves the right to increase subscription fees at our sole discretion without prior notice.',
      charStart: 0,
      charEnd: 100,
    };

    const evaluated = evaluateSingleClause(clause, ftcRules);
    expect(evaluated.severity).toBe('Watch');
    expect(evaluated.category).toBe('UnilateralPriceHike');
  });

  it('triggers California Unconditional Gift remedy when unlawful renewal clauses exist in CA jurisdiction', () => {
    const clauses: CandidateClause[] = [
      {
        id: 'c1',
        clauseNumber: 1,
        heading: 'RENEWAL & REFUNDS',
        rawText: 'All fees are final and non-refundable upon renewal under any circumstances. You must call customer service to cancel.',
        charStart: 0,
        charEnd: 120,
      },
    ];

    const report = evaluateAgreement(clauses, 'CA', 'Test Gym Agreement');
    expect(report.summary.unconditionalGiftTriggered).toBe(true);
    expect(report.summary.unlawfulCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.riskLevel).toBe('Elevated');
  });

  it('rates a fully compliant agreement as Compliant with 100% score', () => {
    const clauses: CandidateClause[] = [
      {
        id: 'c1',
        clauseNumber: 1,
        heading: 'CANCELLATION',
        rawText: 'You can terminate online at will at any time. Simply click on the Cancel Subscription button in your account settings.',
        charStart: 0,
        charEnd: 120,
      },
      {
        id: 'c2',
        clauseNumber: 2,
        heading: 'RENEWAL REMINDERS',
        rawText: 'We will send you a reminder notice 15 to 45 days prior to each annual renewal date.',
        charStart: 0,
        charEnd: 100,
      },
    ];

    const report = evaluateAgreement(clauses, 'CA', 'Transparent Co');
    expect(report.summary.unlawfulCount).toBe(0);
    expect(report.summary.watchCount).toBe(0);
    expect(report.summary.riskLevel).toBe('Compliant');
    expect(report.summary.scorePercentage).toBe(100);
    expect(report.summary.unconditionalGiftTriggered).toBe(false);
  });
});
