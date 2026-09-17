import { EvaluatedClause } from './clause';
import { JurisdictionCode } from './statute';

export type RiskLevel = 'Critical' | 'Elevated' | 'Low' | 'Compliant';

export interface AuditSummary {
  totalClauses: number;
  unlawfulCount: number;
  watchCount: number;
  standardCount: number;
  riskLevel: RiskLevel;
  unconditionalGiftTriggered: boolean;
  scorePercentage: number; // 0 (100% unlawful traps) to 100 (clean)
}

export interface AuditReport {
  auditId: string;
  timestamp: string;
  jurisdiction: JurisdictionCode;
  agreementTitle: string;
  summary: AuditSummary;
  clauses: EvaluatedClause[];
}
