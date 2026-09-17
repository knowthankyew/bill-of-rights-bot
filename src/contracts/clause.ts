import { TrapCategory, TrapSeverity } from './statute';

export interface CandidateClause {
  id: string;
  clauseNumber: number;
  heading: string;
  rawText: string;
  charStart: number;
  charEnd: number;
}

export interface EvaluatedClause {
  id: string;
  clauseNumber: number;
  heading: string;
  rawText: string;
  severity: TrapSeverity;
  category?: TrapCategory;
  matchedRuleId?: string;
  trapName?: string;
  statutoryCitation?: string;
  statuteSummary?: string;
  explanation?: string;
  remedy?: string;
  matchedSnippet?: string;
}
