import {
  CandidateClause,
  EvaluatedClause,
} from '../contracts/clause';
import {
  JurisdictionCode,
  StatuteDataset,
  StatuteRule,
  TrapSeverity,
} from '../contracts/statute';
import { AuditReport, AuditSummary, RiskLevel } from '../contracts/audit';

import ftcData from '../../data/statutes/ftc.json';
import californiaData from '../../data/statutes/california.json';
import newYorkData from '../../data/statutes/new-york.json';
import illinoisData from '../../data/statutes/illinois.json';
import coloradoData from '../../data/statutes/colorado.json';
import delawareData from '../../data/statutes/delaware.json';

export const STATUTE_CATALOG: Record<JurisdictionCode, StatuteDataset> = {
  FTC: ftcData as unknown as StatuteDataset,
  CA: californiaData as unknown as StatuteDataset,
  NY: newYorkData as unknown as StatuteDataset,
  IL: illinoisData as unknown as StatuteDataset,
  CO: coloradoData as unknown as StatuteDataset,
  DE: delawareData as unknown as StatuteDataset,
};

/**
 * Evaluates candidate clauses against statutory rules for a specified jurisdiction.
 * Always includes FTC baseline rules plus the chosen state jurisdiction rules.
 */
export function evaluateAgreement(
  clauses: CandidateClause[],
  jurisdiction: JurisdictionCode = 'CA',
  agreementTitle = 'Subscription Terms of Service'
): AuditReport {
  // Aggregate rules: Federal Trade Commission rules are universal baseline
  const activeRules: StatuteRule[] = [...STATUTE_CATALOG.FTC.rules];

  if (jurisdiction !== 'FTC' && STATUTE_CATALOG[jurisdiction]) {
    activeRules.push(...STATUTE_CATALOG[jurisdiction].rules);
  }

  const evaluatedClauses: EvaluatedClause[] = clauses.map(clause => {
    return evaluateSingleClause(clause, activeRules);
  });

  const summary = calculateSummary(evaluatedClauses, jurisdiction);

  return {
    auditId: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    jurisdiction,
    agreementTitle,
    summary,
    clauses: evaluatedClauses,
  };
}

interface CompiledRuleCache {
  triggerRegexes: RegExp[];
  exceptionRegexes: RegExp[];
}

const COMPILED_RULES_CACHE = new Map<string, CompiledRuleCache>();

function getCompiledRule(rule: StatuteRule): CompiledRuleCache {
  let cached = COMPILED_RULES_CACHE.get(rule.id);
  if (!cached) {
    const triggerRegexes = rule.triggerPatterns
      .map((p) => {
        try {
          return new RegExp(p, 'i');
        } catch (err) {
          console.error(`Invalid trigger regex in rule ${rule.id}:`, p, err);
          return null;
        }
      })
      .filter((r): r is RegExp => r !== null);

    const exceptionRegexes = (rule.negativeExceptions || [])
      .map((p) => {
        try {
          return new RegExp(p, 'i');
        } catch (err) {
          console.error(`Invalid exception regex in rule ${rule.id}:`, p, err);
          return null;
        }
      })
      .filter((r): r is RegExp => r !== null);

    cached = { triggerRegexes, exceptionRegexes };
    COMPILED_RULES_CACHE.set(rule.id, cached);
  }
  return cached;
}

/**
 * Evaluates a single clause against the active statutory rules.
 */
export function evaluateSingleClause(
  clause: CandidateClause,
  rules: StatuteRule[]
): EvaluatedClause {
  const fullText = `${clause.heading}\n${clause.rawText}`;

  // Prioritize Unlawful matches over Watch matches
  let bestMatch: {
    rule: StatuteRule;
    snippet: string;
  } | null = null;

  for (const rule of rules) {
    const compiled = getCompiledRule(rule);

    // 1. Check negative exceptions first
    if (compiled.exceptionRegexes.some((regex) => regex.test(fullText))) {
      continue; // Skip this rule; exception satisfied
    }

    // 2. Check trigger patterns
    for (const regex of compiled.triggerRegexes) {
      const match = regex.exec(fullText);

      if (match) {
        const matchedSnippet = extractSentenceAroundMatch(fullText, match.index, match[0].length);

        if (!bestMatch || severityRank(rule.severity) > severityRank(bestMatch.rule.severity)) {
          bestMatch = { rule, snippet: matchedSnippet };
        }
        break; // Rule matched; move to next candidate or break
      }
    }
  }

  if (bestMatch) {
    const { rule, snippet } = bestMatch;
    return {
      id: clause.id,
      clauseNumber: clause.clauseNumber,
      heading: clause.heading,
      rawText: clause.rawText,
      severity: rule.severity,
      category: rule.category,
      matchedRuleId: rule.id,
      trapName: rule.trapName,
      statutoryCitation: rule.statutoryCitation,
      statuteSummary: rule.statuteSummary,
      explanation: rule.statuteSummary,
      remedy: rule.disputeTemplate,
      matchedSnippet: snippet,
    };
  }

  return {
    id: clause.id,
    clauseNumber: clause.clauseNumber,
    heading: clause.heading,
    rawText: clause.rawText,
    severity: 'Standard',
  };
}

function severityRank(severity: TrapSeverity): number {
  switch (severity) {
    case 'Unlawful':
      return 3;
    case 'Watch':
      return 2;
    case 'Standard':
      return 1;
    default:
      return 0;
  }
}

function extractSentenceAroundMatch(text: string, matchIdx: number, matchLen: number): string {
  const windowStart = Math.max(0, matchIdx - 60);
  const windowEnd = Math.min(text.length, matchIdx + matchLen + 60);

  let snippet = text.slice(windowStart, windowEnd).trim();
  if (windowStart > 0) snippet = `...${snippet}`;
  if (windowEnd < text.length) snippet = `${snippet}...`;
  return snippet;
}

function calculateSummary(
  clauses: EvaluatedClause[],
  jurisdiction: JurisdictionCode
): AuditSummary {
  let unlawfulCount = 0;
  let watchCount = 0;
  let standardCount = 0;

  for (const c of clauses) {
    if (c.severity === 'Unlawful') unlawfulCount++;
    else if (c.severity === 'Watch') watchCount++;
    else standardCount++;
  }

  let riskLevel: RiskLevel = 'Compliant';
  if (unlawfulCount >= 2) riskLevel = 'Critical';
  else if (unlawfulCount === 1) riskLevel = 'Elevated';
  else if (watchCount > 0) riskLevel = 'Low';

  // Unconditional gift applies when any unlawful renewal trap exists
  // in California jurisdiction or under California statute § 17603
  const unconditionalGiftTriggered =
    unlawfulCount > 0 &&
    (jurisdiction === 'CA' || clauses.some(c => c.matchedRuleId?.startsWith('CA-ARL')));

  const rawScore = 100 - unlawfulCount * 25 - watchCount * 10;
  const scorePercentage = Math.max(0, Math.min(100, rawScore));

  return {
    totalClauses: clauses.length,
    unlawfulCount,
    watchCount,
    standardCount,
    riskLevel,
    unconditionalGiftTriggered,
    scorePercentage,
  };
}
