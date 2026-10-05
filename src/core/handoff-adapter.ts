import { KtyHandoffPayload } from '@knowthankyew/privacy-telemetry';
import { AuditReport, RiskLevel } from '../contracts/audit';
import { EvaluatedClause } from '../contracts/clause';
import { JurisdictionCode, TrapCategory, TrapSeverity } from '../contracts/statute';

/**
 * Transforms an incoming KnowThankYew handoff payload into a fully-grounded
 * AuditReport, bypassing manual document intake and dropzones.
 */
export function mapHandoffToAuditReport(
  payload: KtyHandoffPayload,
  jurisdiction: JurisdictionCode = 'FTC'
): AuditReport {
  const clauses: EvaluatedClause[] = payload.findings.map((f, idx) => {
    let severity: TrapSeverity = 'Standard';
    if (f.severity === 'CRITICAL') severity = 'Unlawful';
    else if (f.severity === 'WARNING') severity = 'Watch';

    let category: TrapCategory = 'InconspicuousRenewal';
    if (f.category === 'AUTO_RENEWAL') category = 'InconspicuousRenewal';
    else if (f.category === 'UNILATERAL_CHANGE') category = 'UnilateralPriceHike';
    else if (f.category === 'ARBITRATION') category = 'AsymmetricCancellation';

    return {
      id: `handoff-${f.ruleId || idx + 1}`,
      clauseNumber: idx + 1,
      heading: f.title,
      rawText: f.matchedSnippet,
      severity,
      category,
      matchedRuleId: f.ruleId,
      trapName: f.title,
      statutoryCitation: f.statuteCode,
      statuteSummary: f.statuteTitle,
      explanation: f.explanation,
      remedy: f.recommendation,
      matchedSnippet: f.matchedSnippet,
    };
  });

  const total = clauses.length;
  const unlawfulCount = clauses.filter((c) => c.severity === 'Unlawful').length;
  const watchCount = clauses.filter((c) => c.severity === 'Watch').length;
  const standardCount = clauses.filter((c) => c.severity === 'Standard').length;

  let riskLevel: RiskLevel = 'Compliant';
  if (unlawfulCount > 0) {
    riskLevel = 'Critical';
  } else if (watchCount > 0) {
    riskLevel = 'Elevated';
  }

  const scorePercentage = Math.max(0, Math.min(100, 100 - payload.riskScore));

  return {
    auditId: `handoff-${payload.domain}-${Date.parse(payload.scanTimestamp) || Date.now()}`,
    timestamp: payload.scanTimestamp,
    jurisdiction,
    agreementTitle: `${payload.domain} (via KnowThankYew Reality Engine)`,
    summary: {
      totalClauses: total,
      unlawfulCount,
      watchCount,
      standardCount,
      riskLevel,
      unconditionalGiftTriggered: unlawfulCount > 0,
      scorePercentage,
    },
    clauses,
  };
}
