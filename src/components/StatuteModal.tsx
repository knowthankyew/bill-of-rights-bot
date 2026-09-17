import React, { useEffect } from 'react';
import { StatuteDataset } from '../contracts/statute';

interface StatuteModalProps {
  statute: StatuteDataset | null;
  onClose: () => void;
}

export const StatuteModal: React.FC<StatuteModalProps> = ({ statute, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!statute) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-statute-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="statute-code">{statute.jurisdictionCode}</span>
            <h2 id="modal-statute-title" className="statute-title" style={{ marginTop: '0.4rem', fontSize: '1.15rem' }}>
              {statute.statuteTitle}
            </h2>
            <p className="statute-codification">{statute.codification}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p>
            <strong>Jurisdiction:</strong> {statute.jurisdictionName}
          </p>
          <p>
            <strong>Official Source:</strong>{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cyan-text)' }}>
              {statute.officialSourceUrl}
            </span>
          </p>
          <p>
            <strong>Last Audited:</strong> {statute.lastAudited}
          </p>

          <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            Codified Rules ({statute.rules.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {statute.rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                    {rule.trapName}
                  </span>
                  <span className={`badge ${rule.severity === 'Unlawful' ? 'badge-unlawful' : 'badge-watch'}`}>
                    {rule.severity}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan-text)', marginBottom: '0.35rem' }}>
                  {rule.statutoryCitation}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {rule.statuteSummary}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" className="action-btn" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
