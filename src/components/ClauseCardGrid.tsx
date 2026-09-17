import React, { useState } from 'react';
import { EvaluatedClause } from '../contracts/clause';
import { TrapSeverity } from '../contracts/statute';

interface ClauseCardGridProps {
  clauses: EvaluatedClause[];
}

export const ClauseCardGrid: React.FC<ClauseCardGridProps> = ({ clauses }) => {
  const [filter, setFilter] = useState<'ALL' | TrapSeverity>('ALL');

  const filtered = clauses.filter((c) => {
    if (filter === 'ALL') return true;
    return c.severity === filter;
  });

  return (
    <div className="clause-grid" role="region" aria-label="Evaluated Agreement Clauses">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Clause Audit Breakdown ({filtered.length} of {clauses.length})
        </h3>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['ALL', 'Unlawful', 'Watch', 'Standard'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`sample-chip ${filter === lvl ? 'active' : ''}`}
              style={filter === lvl ? { background: 'var(--surface-active)', borderColor: 'var(--border-focus)', color: 'var(--text-primary)' } : {}}
              onClick={() => setFilter(lvl)}
            >
              {lvl === 'ALL' ? 'All Clauses' : lvl === 'Standard' ? 'Compliant' : lvl}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No clauses match the selected filter.
        </div>
      ) : (
        filtered.map((clause) => (
          <article
            key={clause.id}
            className={`clause-card severity-${clause.severity}`}
            tabIndex={0}
          >
            <div className="clause-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="clause-heading">
                  {clause.heading}
                </span>
                {clause.trapName && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    • {clause.trapName}
                  </span>
                )}
              </div>

              <div className="badge-group">
                <span
                  className={`badge ${
                    clause.severity === 'Unlawful'
                      ? 'badge-unlawful'
                      : clause.severity === 'Watch'
                      ? 'badge-watch'
                      : 'badge-standard'
                  }`}
                >
                  {clause.severity === 'Standard' ? 'Compliant' : clause.severity}
                </span>
                {clause.statutoryCitation && (
                  <span className="clause-citation" title="Codified legal statute governing this provision">
                    {clause.statutoryCitation}
                  </span>
                )}
              </div>
            </div>

            <div className="clause-body">
              {clause.matchedSnippet ? (
                <span>
                  {clause.rawText.split(clause.matchedSnippet.replace(/\.\.\./g, ''))[0]}
                  <mark className="highlight-snippet">
                    {clause.matchedSnippet.replace(/\.\.\./g, '')}
                  </mark>
                  {clause.rawText.split(clause.matchedSnippet.replace(/\.\.\./g, ''))[1] || ''}
                </span>
              ) : (
                clause.rawText
              )}
            </div>

            {clause.explanation && (
              <div className="clause-analysis">
                <div>
                  <span className="analysis-label">Statutory Violation:</span>
                  <span>{clause.explanation}</span>
                </div>
                {clause.remedy && (
                  <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--cyan-text)', marginRight: '0.35rem' }}>
                      Remedy Defense:
                    </span>
                    <span>{clause.remedy}</span>
                  </div>
                )}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
};
