import { describe, it, expect } from 'vitest';
import { mapHandoffToAuditReport } from '../../src/core/handoff-adapter';
import { generateStatutoryNotice } from '../../src/core/notice-generator';
import { KtyHandoffPayload } from '@knowthankyew/privacy-telemetry';

describe('Milestone 7 Phase 3: Destination Handoff Intake Bypass (tests/unit/handoff-adapter.test.ts)', () => {
  const samplePayload: KtyHandoffPayload = {
    version: '1.0',
    originApp: 'knowthankyew-extension',
    domain: 'predatory-gym.com',
    scanTimestamp: '2026-10-04T18:00:00.000Z',
    riskScore: 85,
    summary: { critical: 2, warning: 1, info: 0 },
    primaryLegalLink: {
      url: 'https://predatory-gym.com/terms',
      title: 'Membership Terms',
      category: 'TERMS',
      source: 'DOM_ANCHOR',
    },
    targetTool: 'bill-of-rights-bot',
    findings: [
      {
        ruleId: 'AR-001',
        title: 'Negative Option Continuous Billing',
        category: 'AUTO_RENEWAL',
        severity: 'CRITICAL',
        statuteCode: '16 CFR Part 425',
        statuteTitle: 'FTC Click-to-Cancel',
        matchedSnippet: 'Membership renews automatically at $59.99/mo until in-person cancellation.',
        explanation: 'Requires physical certified mail or in-person visits to cancel online signup.',
        recommendation: 'Demand symmetrical click-to-cancel mechanism under FTC rule.',
      },
      {
        ruleId: 'ARB-001',
        title: 'Forced Arbitration Waiver',
        category: 'ARBITRATION',
        severity: 'WARNING',
        statuteCode: '9 U.S.C. § 2',
        statuteTitle: 'FAA Waiver',
        matchedSnippet: 'You waive all rights to a jury trial or class action dispute.',
        explanation: 'Forces consumer claims into private corporate dispute tribunals.',
        recommendation: 'Send 30-day arbitration opt-out letter.',
      },
    ],
  };

  it('maps KtyHandoffPayload to an actionable AuditReport with zero data loss', () => {
    const report = mapHandoffToAuditReport(samplePayload, 'FTC');

    expect(report.jurisdiction).toBe('FTC');
    expect(report.agreementTitle).toContain('predatory-gym.com');
    expect(report.summary.totalClauses).toBe(2);
    expect(report.summary.unlawfulCount).toBe(1);
    expect(report.summary.watchCount).toBe(1);
    expect(report.summary.riskLevel).toBe('Critical');
    expect(report.summary.scorePercentage).toBe(15);
    expect(report.summary.unconditionalGiftTriggered).toBe(true);

    const unlawfulClause = report.clauses[0];
    expect(unlawfulClause.heading).toBe('Negative Option Continuous Billing');
    expect(unlawfulClause.severity).toBe('Unlawful');
    expect(unlawfulClause.statutoryCitation).toBe('16 CFR Part 425');
    expect(unlawfulClause.statuteSummary).toBe('FTC Click-to-Cancel');
    expect(unlawfulClause.remedy).toContain('symmetrical click-to-cancel');

    const watchClause = report.clauses[1];
    expect(watchClause.severity).toBe('Watch');
  });

  it('feeds handoff report directly into RemedyStudio dispute notice generator', () => {
    const report = mapHandoffToAuditReport(samplePayload, 'CA');

    const citedClauses = report.clauses
      .filter((c) => c.severity === 'Unlawful')
      .map((c) => `${c.heading}: ${c.statutoryCitation} - ${c.trapName}`);

    expect(citedClauses.length).toBe(1);

    const notice = generateStatutoryNotice('ClickToCancelDemand', {
      subscriberName: 'Jane Consumer',
      vendorName: 'Predatory Gym LLC',
      accountIdentifier: 'jane@example.com',
      jurisdiction: 'CA',
      cancellationDate: '2026-10-04',
      disputedAmount: '59.99',
      unlawfulClausesCited: citedClauses,
    });

    expect(notice.content).toContain('Predatory Gym LLC');
    expect(notice.content).toContain('16 CFR Part 425');
    expect(notice.content).toContain('Negative Option Continuous Billing');

    const clawback = generateStatutoryNotice('UnconditionalGiftClawback', {
      subscriberName: 'Jane Consumer',
      vendorName: 'Predatory Gym LLC',
      accountIdentifier: 'jane@example.com',
      jurisdiction: 'CA',
      cancellationDate: '2026-10-04',
      disputedAmount: '59.99',
      unlawfulClausesCited: citedClauses,
    });
    expect(clawback.content).toContain('$59.99');
    expect(clawback.content).toContain('UNCONDITIONAL GIFT');
  });
});
