import { GeneratedNotice, NoticePayload, NoticeType } from '../contracts/notice';

/**
 * Generates formal statutory consumer protection notices and dispute documents.
 */
export function generateStatutoryNotice(
  type: NoticeType,
  payload: NoticePayload
): GeneratedNotice {
  const subscriber = payload.subscriberName || '[SUBSCRIBER NAME]';
  const vendor = payload.vendorName || '[COMPANY / VENDOR NAME]';
  const accountId = payload.accountIdentifier || '[ACCOUNT / EMAIL IDENTIFIER]';
  const dateStr = payload.cancellationDate || new Date().toISOString().split('T')[0];
  const disputedAmount = payload.disputedAmount ? `$${payload.disputedAmount}` : '[AMOUNT CHARGED]';

  const clausesCitedText =
    payload.unlawfulClausesCited && payload.unlawfulClausesCited.length > 0
      ? payload.unlawfulClausesCited.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : '1. Asymmetric cancellation mechanism requiring phone calls or certified mail.\n2. Inconspicuous automatic renewal terms without required advance written notice.';

  switch (type) {
    case 'ClickToCancelDemand': {
      return {
        type: 'ClickToCancelDemand',
        title: 'Statutory Immediate Cancellation Demand (Click-to-Cancel Notice)',
        statutoryBasis: '16 CFR Part 425 (FTC Negative Option Rule) & State Automatic Renewal Laws',
        recommendedAction: 'Send via email to vendor customer support and keep a timestamped copy for bank dispute records.',
        content: `DATE: ${dateStr}
TO: ${vendor} (Customer Service / Billing Department)
FROM: ${subscriber} (${accountId})
SUBJECT: FORMAL NOTICE OF IMMEDIATE SUBSCRIPTION TERMINATION PURSUANT TO FTC CLICK-TO-CANCEL MANDATE

To Whom It May Concern at ${vendor}:

Please accept this correspondence as my formal, unconditional, and immediate cancellation of all subscriptions, recurring memberships, continuous services, and auto-renewal billing associated with my account: ${accountId}.

LEGAL BASIS & CITATIONS:
1. Federal Trade Commission Negative Option Rule (16 CFR § 425.6): Federal law explicitly mandates that sellers must provide a cancellation mechanism that is at least as simple as the mechanism used to enroll. As I enrolled online, any requirement conditioning cancellation upon calling customer care, speaking with retention agents, or submitting postal mail is strictly unlawful.
2. State Automatic Renewal Statutes (including Cal. Bus. & Prof. Code § 17602(c), N.Y. Gen. Bus. Law § 527-a, 815 ILCS 601/): State law guarantees consumers enrolled online the right to terminate continuous service exclusively online at will without delay, administrative obstacles, or retention gauntlets.

SPECIFIC UNLAWFUL PROVISIONS IDENTIFIED IN YOUR TERMS:
${clausesCitedText}

MANDATORY DIRECTIVES:
1. Terminate all recurring billing, memberships, and subscription charges immediately upon receipt of this notice.
2. Provide written confirmation of this cancellation, with a confirmation or reference number, within 24 business hours.
3. Do not place my account into any retention queue or subject me to unsolicited counter-offers ("saves"), which are unlawful without prior express consent under 16 CFR § 425.6(b).

Any subsequent charges levied against my payment method will be treated as unauthorized fraudulent transactions and disputed immediately with my financial institution, with a copy of this statutory notice and a formal complaint submitted to the FTC Bureau of Consumer Protection and the state Attorney General.

Sincerely,

${subscriber}
Account Identifier: ${accountId}
Date of Delivery: ${dateStr}
`,
      };
    }

    case 'FTCComplaint': {
      return {
        type: 'FTCComplaint',
        title: 'Consumer Complaint Draft for FTC & State Attorney General',
        statutoryBasis: 'FTC Act Section 5 (15 U.S.C. § 45), 16 CFR Part 425, & ROSCA (15 U.S.C. § 8401)',
        recommendedAction: 'Copy and paste into reportfraud.ftc.gov and your state Attorney General Consumer Protection complaint portal.',
        content: `FORMAL CONSUMER PROTECTION REGULATORY COMPLAINT DRAFT
TO: Federal Trade Commission Bureau of Consumer Protection (reportfraud.ftc.gov)
    State Attorney General - Consumer Protection Division
STATUTORY BASIS: FTC Act Section 5 (15 U.S.C. § 45), 16 CFR Part 425, and ROSCA (15 U.S.C. § 8401)

1. COMPLAINANT INFORMATION:
Name: ${subscriber}
Contact/Email: ${accountId}
Jurisdiction: ${payload.jurisdiction}
Date: ${dateStr}

2. RESPONDENT (REPORTED BUSINESS):
Company Name: ${vendor}
Transaction Medium: Online Consumer Subscription

3. STATUTORY VIOLATIONS ALLEGED:
• Violation of 16 CFR § 425.6(a) (Failure to provide simple 'Click-to-Cancel' mechanism; imposition of asymmetric cancellation gauntlets).
• Violation of 16 CFR § 425.3 & ROSCA (15 U.S.C. § 8403) (Inconspicuous disclosure of recurring negative option terms).
• State Automatic Renewal Law Violations (${payload.jurisdiction} ARL) regarding mandatory advance written reminder notices and friction-free online cancellation.

4. FACTUAL SUMMARY & DECEPTIVE PRACTICE:
The respondent company, ${vendor}, utilized deceptive subscription renewal architecture in its terms and checkout flow. Specifically, the agreement incorporates the following unlawful clauses:

${clausesCitedText}

The respondent made enrollment effortless via online checkout, yet systematically obstructed cancellation by demanding telephonic interaction or administrative hurdles, in direct contravention of the FTC Negative Option Rule.

5. RELIEF REQUESTED:
I request that the FTC and State Attorney General initiate regulatory inquiry into ${vendor}'s negative option billing practices, mandate compliance with 16 CFR Part 425, and order full restitution of all unauthorized renewal fees.
`,
      };
    }

    case 'UnconditionalGiftClawback': {
      return {
        type: 'UnconditionalGiftClawback',
        title: 'Statutory Unconditional Gift Restitution Demand',
        statutoryBasis: 'Cal. Bus. & Prof. Code § 17603 & State Restitution Doctrines',
        recommendedAction: 'Send to merchant billing department and provide as exhibit to card issuer for immediate chargeback.',
        content: `DATE: ${dateStr}
TO: ${vendor} (Accounts Receivable & Legal Department)
FROM: ${subscriber} (${accountId})
SUBJECT: FORMAL RESTITUTION DEMAND & NOTICE OF UNCONDITIONAL GIFT (CAL. BUS. & PROF. CODE § 17603)

Dear Billing Supervisor:

This letter constitutes formal notice of dispute and a demand for immediate restitution in the amount of ${disputedAmount} improperly charged to my payment method on or about ${dateStr}.

VIOLATION OF AUTOMATIC RENEWAL LAW:
Your company enrolled or renewed my account into a continuous service arrangement without complying with statutory mandates under California Business & Professions Code §§ 17600–17606 and the FTC Negative Option Rule (16 CFR Part 425). Specifically, your agreement failed to provide required advance reminder notices and imposed non-compliant cancellation barriers:

${clausesCitedText}

STATUTORY UNCONDITIONAL GIFT MANDATE:
Under California Business & Professions Code § 17603:
"In any case in which a business sends any goods, wares, merchandise, or services to a consumer under a continuous service agreement or automatic renewal of a purchase, without first obtaining the consumer's affirmative consent as described in Section 17602... the goods, wares, merchandise, or services shall for all purposes be deemed an unconditional gift to the consumer, who may use or dispose of the same in any manner he or she sees fit without any obligation whatsoever on the consumer's part to the business..."

Because your renewal terms violate statutory prerequisites, all services or merchandise rendered constitute an UNCONDITIONAL GIFT under law. You had no statutory authority to bill my payment method.

DEMAND FOR RELIEF:
1. Issue an immediate, full credit/refund of ${disputedAmount} to my original payment method within five (5) business days.
2. Confirm total termination of my subscription account with zero outstanding balance.

Failure to issue immediate refund will result in an immediate formal fraud chargeback filed with my credit card issuing bank citing Cal. Bus. & Prof. Code § 17603, alongside statutory complaints lodged with regulatory agencies.

Sincerely,

${subscriber}
Account: ${accountId}
`,
      };
    }
  }
}
