import React from 'react';
import { JurisdictionCode, StatuteDataset } from '../contracts/statute';
import { STATUTE_CATALOG } from '../core/rule-engine';

interface StatuteRailProps {
  selectedJurisdiction: JurisdictionCode;
  onInspectStatute: (statute: StatuteDataset) => void;
}

export const StatuteRail: React.FC<StatuteRailProps> = ({
  selectedJurisdiction,
  onInspectStatute,
}) => {
  const ftcDataset = STATUTE_CATALOG.FTC;
  const stateDataset = selectedJurisdiction !== 'FTC' ? STATUTE_CATALOG[selectedJurisdiction] : null;

  return (
    <aside className="statute-rail" aria-label="Grounded Statutory Canon">
      <div className="rail-heading">
        <span aria-hidden="true">📚</span>
        <span>Grounded Statutes</span>
      </div>

      <div
        className="statute-card active"
        onClick={() => onInspectStatute(ftcDataset)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onInspectStatute(ftcDataset)}
        title="Click to view full FTC Click-to-Cancel codified rules"
      >
        <div className="statute-header">
          <span className="statute-code">FEDERAL</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {ftcDataset.rules.length} Rules
          </span>
        </div>
        <div className="statute-title">{ftcDataset.statuteTitle}</div>
        <div className="statute-codification">{ftcDataset.codification}</div>
        {ftcDataset.regulatoryStatus && (
          <div style={{ marginTop: '0.4rem', padding: '0.25rem 0.5rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '4px', fontSize: '0.7rem', color: '#facc15' }}>
            ⚠️ 16 CFR Part 425 Vacated — Enforced via ROSCA & FTC Act §5
          </div>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Symmetric cancellation, express consent, and prohibition of deceptive renewal under federal statute.
        </p>
      </div>

      {stateDataset && (
        <div
          className="statute-card active"
          onClick={() => onInspectStatute(stateDataset)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onInspectStatute(stateDataset)}
          title={`Click to view full ${stateDataset.jurisdictionName} codified rules`}
        >
          <div className="statute-header">
            <span className="statute-code">{stateDataset.jurisdictionCode}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {stateDataset.rules.length} Rules
            </span>
          </div>
          <div className="statute-title">{stateDataset.statuteTitle}</div>
          <div className="statute-codification">{stateDataset.codification}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {stateDataset.jurisdictionCode === 'CA'
              ? 'AB 390 / AB 2863 notice timelines, immediate online termination, and statutory unconditional gift restitution.'
              : `State-specific automatic renewal protections, mandatory advance notice, and cancellation mandates.`}
          </p>
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          ⚖️ Statutory Grounding Guarantee
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
          Every flag matches directly against official law. BillOfRightsBot rejects ungrounded AI hallucinations and operates 100% locally.
        </p>
      </div>
    </aside>
  );
};
