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

  it('generates Click-to-Cancel Statutory Notice with 16 CFR § 425.6 and state citations', () => {
    const notice = generateStatutoryNotice('ClickToCancelDemand', basePayload);
    expect(notice.type).toBe('ClickToCancelDemand');
    expect(notice.title).toContain('Click-to-Cancel Notice');
    expect(notice.content).toContain('Alex Rivera');
    expect(notice.content).toContain('OmniStream Media');
    expect(notice.content).toContain('16 CFR § 425.6');
    expect(notice.content).toContain('Cal. Bus. & Prof. Code § 17602(c)');
    expect(notice.content).toContain('Section 4: Mandating telephonic cancellation');
  });

  it('generates FTC and State AG Regulatory Complaint Draft', () => {
    const notice = generateStatutoryNotice('FTCComplaint', basePayload);
    expect(notice.type).toBe('FTCComplaint');
    expect(notice.content).toContain('reportfraud.ftc.gov');
    expect(notice.content).toContain('15 U.S.C. § 45');
    expect(notice.content).toContain('16 CFR § 425.6(a)');
    expect(notice.content).toContain('OmniStream Media');
  });

  it('generates Unconditional Gift Restitution Demand citing Cal. Bus. & Prof. Code § 17603', () => {
    const notice = generateStatutoryNotice('UnconditionalGiftClawback', basePayload);
    expect(notice.type).toBe('UnconditionalGiftClawback');
    expect(notice.content).toContain('Cal. Bus. & Prof. Code § 17603');
    expect(notice.content).toContain('$79.99');
    expect(notice.content).toContain('UNCONDITIONAL GIFT');
    expect(notice.content).toContain('OmniStream Media');
  });
});
