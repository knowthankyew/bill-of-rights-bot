import { JurisdictionCode } from './statute';

export type NoticeType =
  | 'ClickToCancelDemand'
  | 'FTCComplaint'
  | 'UnconditionalGiftClawback';

export interface NoticePayload {
  subscriberName: string;
  subscriberEmail?: string;
  vendorName: string;
  accountIdentifier: string;
  jurisdiction: JurisdictionCode;
  cancellationDate: string;
  disputedAmount?: string;
  unlawfulClausesCited: string[];
}

export interface GeneratedNotice {
  type: NoticeType;
  title: string;
  statutoryBasis: string;
  content: string;
  recommendedAction: string;
}
