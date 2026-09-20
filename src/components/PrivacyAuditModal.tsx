import React from 'react';
import { telemetry, PrivacyAuditReport, SessionAuditEvent } from '../core/telemetry';

interface PrivacyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBurnData: () => void;
}

export const PrivacyAuditModal: React.FC<PrivacyAuditModalProps> = ({
  isOpen,
  onClose,
  onBurnData,
}) => {
  if (!isOpen) return null;

  const report: PrivacyAuditReport = telemetry.getPrivacyAuditReport();
  const claims = telemetry.getPrivacyClaims();
  const auditLogs: readonly SessionAuditEvent[] = telemetry.getAuditLog();

  const handleDownloadAudit = () => {
    const jsonStr = telemetry.downloadSessionAuditJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-of-rights-bot-session-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
      <div className="modal-content" style={{ maxWidth: '720px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: claims.isLocalOnlyHonest ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `1px solid ${claims.isLocalOnlyHonest ? 'var(--emerald-accent)' : 'var(--amber-accent)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              🛡️
            </div>
            <div>
              <h2 id="privacy-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {claims.isEnterpriseBuild ? 'Enterprise Telemetry Verification' : 'Privacy & Telemetry Verification'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Inspect real-time telemetry state, data retention, and session audit trails
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Real-time Status Card */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: claims.isLocalOnlyHonest ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${claims.isLocalOnlyHonest ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>{claims.isLocalOnlyHonest ? '✅' : '⚠️'}</span>
              <strong style={{ color: claims.isLocalOnlyHonest ? '#34d399' : '#fbbf24', fontSize: '0.95rem' }}>
                {claims.modalStatusTitle}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {claims.modalStatusDescription}
            </p>
          </div>

          {/* Configuration Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ padding: '0.85rem', background: 'var(--surface-card)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observability
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {report.telemetryMode}
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--surface-card)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Network Egress
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {report.networkEgress}
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--surface-card)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Buffered Spans
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {report.activeSpanCount} in memory
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--surface-card)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Burn Storage
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: report.burnEnabled ? '#34d399' : 'var(--text-muted)' }}>
                {report.burnEnabled ? 'Enabled (Purge)' : 'Disabled'}
              </div>
            </div>
          </div>

          {/* Session Audit Section */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  In-Memory Session Audit Trail ({auditLogs.length} events)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Append-only activity verification. Does not contain raw agreement text.
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownloadAudit}
                disabled={auditLogs.length === 0}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  cursor: auditLogs.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: auditLogs.length === 0 ? 0.5 : 1,
                  fontWeight: 600,
                }}
                title="Download session audit log as JSON"
              >
                📥 Download JSON
              </button>
            </div>

            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'var(--bg-app)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
              }}
            >
              {auditLogs.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit events recorded in this session yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '6px 10px' }}>Time</th>
                      <th style={{ padding: '6px 10px' }}>Action</th>
                      <th style={{ padding: '6px 10px' }}>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <code style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: '#38bdf8' }}>
                            {log.action}
                          </code>
                        </td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>{log.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-header)' }}>
          <button
            type="button"
            className="burn-btn"
            onClick={() => {
              onBurnData();
              onClose();
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span aria-hidden="true">🔥</span>
            <span>Burn All Local Data & Telemetry</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
