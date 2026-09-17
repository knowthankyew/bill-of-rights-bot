export type JurisdictionCode = 'FTC' | 'CA' | 'NY' | 'IL' | 'CO' | 'DE';

export type TrapSeverity = 'Unlawful' | 'Watch' | 'Standard';

export type TrapCategory =
  | 'AsymmetricCancellation'
  | 'RetentionMaze'
  | 'InconspicuousRenewal'
  | 'PreRenewalNotice'
  | 'UnilateralPriceHike'
  | 'TrialConversion'
  | 'UnconditionalGift'
  | 'AffirmativeConsent';

export interface StatuteRule {
  id: string;
  category: TrapCategory;
  trapName: string;
  severity: TrapSeverity;
  statutoryCitation: string;
  statuteSummary: string;
  triggerPatterns: string[];
  negativeExceptions?: string[];
  disputeTemplate: string;
}

export interface StatuteDataset {
  $schema?: string;
  jurisdictionCode: JurisdictionCode;
  jurisdictionName: string;
  statuteTitle: string;
  codification: string;
  lastAudited: string;
  officialSourceUrl: string;
  rules: StatuteRule[];
}
