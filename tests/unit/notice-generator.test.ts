import { describe, it, expect } from 'vitest';
import { generateStatutoryNotice } from '../../src/core/notice-generator';

describe('notice-generator', () => {
  const basePayload = {
    subscriberName: 'Alex Rivera',
    subscriberEmail: 'alex@example.com',
    vendorName: 'OmniStream Media',
    accountIdentifier: 'alex@example.com',
    jurisdiction: 'CA' as const,
    cancellationDate: '2026-09-17',
    disputedAmount: '79.99',
    unlawfulClausesCited: [
      'Section 4: Mandating telephonic cancellation via 1-800 number',
      'Section 5: Disclaiming all renewal refunds and hiding reminder notices',
    ],
  };

  it('generates symmetric cancellation demand citing active ROSCA, FTC Act § 5, and state statutes (never vacated 16 CFR Part 425)', () => {
    const notice = generateStatutoryNotice('ClickToCancelDemand', basePayload);
    expect(notice.type).toBe('ClickToCancelDemand');
    expect(notice.title).toContain('Symmetric Cancellation Notice');
    expect(notice.content).toContain('Alex Rivera');
    expect(notice.content).toContain('OmniStream Media');
    expect(notice.content).toContain('15 U.S.C. § 8403');
    expect(notice.content).toContain('15 U.S.C. § 45(a)');
    expect(notice.content).toContain('Cal. Bus. & Prof. Code § 17602(c)');
    expect(notice.content).toContain('Section 4: Mandating telephonic cancellation');
    expect(notice.statutoryBasis).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);
    expect(notice.content).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);
  });

  it('generates FTC and State AG Regulatory Complaint Draft without vacated 16 CFR Part 425 citations', () => {
    const notice = generateStatutoryNotice('FTCComplaint', basePayload);
    expect(notice.type).toBe('FTCComplaint');
    expect(notice.content).toContain('reportfraud.ftc.gov');
    expect(notice.content).toContain('15 U.S.C. § 45(a)');
    expect(notice.content).toContain('15 U.S.C. § 8403');
    expect(notice.content).toContain('OmniStream Media');
    expect(notice.statutoryBasis).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);
    expect(notice.content).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);
  });

  it('generates Unconditional Gift Restitution Demand citing Cal. Bus. & Prof. Code § 17603 and ROSCA', () => {
    const notice = generateStatutoryNotice('UnconditionalGiftClawback', basePayload);
    expect(notice.type).toBe('UnconditionalGiftClawback');
    expect(notice.content).toContain('Cal. Bus. & Prof. Code § 17603');
    expect(notice.content).toContain('15 U.S.C. § 8403');
    expect(notice.content).toContain('$79.99');
    expect(notice.content).toContain('UNCONDITIONAL GIFT');
    expect(notice.content).toContain('OmniStream Media');
    expect(notice.content).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);
  });
});
