import React from 'react';
import { AuditSummary } from '../contracts/audit';

interface ScorecardProps {
  summary: AuditSummary;
}

export const Scorecard: React.FC<ScorecardProps> = ({ summary }) => {
  return (
    <div className="scorecard-container" role="region" aria-label="Agreement Audit Scorecard">
      <div className={`scorecard-item ${summary.unlawfulCount > 0 ? 'danger' : 'success'}`}>
        <span className="score-title">Unlawful Traps</span>
        <span className="score-number">{summary.unlawfulCount}</span>
      </div>

      <div className={`scorecard-item ${summary.watchCount > 0 ? 'warning' : 'success'}`}>
        <span className="score-title">Watch Clauses</span>
        <span className="score-number">{summary.watchCount}</span>
      </div>

      <div className="scorecard-item success">
        <span className="score-title">Compliant Clauses</span>
        <span className="score-number">{summary.standardCount}</span>
      </div>

      <div className="scorecard-item">
        <span className="score-title">Compliance Score</span>
        <span className="score-number" style={{ color: summary.scorePercentage < 60 ? 'var(--crimson-text)' : summary.scorePercentage < 85 ? 'var(--amber-text)' : 'var(--emerald-text)' }}>
          {summary.scorePercentage}%
        </span>
      </div>

      {summary.unconditionalGiftTriggered && (
        <div className="scorecard-item unconditional">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span aria-hidden="true">🎁</span>
            <span className="score-title">Statutory Remedy Activated: Unconditional Gift</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#e9d5ff', marginTop: '0.25rem' }}>
            Under <strong>Cal. Bus. & Prof. Code § 17603</strong>, goods or services provided following non-compliant auto-renewals constitute an <strong>unconditional gift</strong>. The subscriber bears zero obligation and is legally entitled to demand immediate restitution of unauthorized charges.
          </p>
        </div>
      )}
    </div>
  );
};
