import React, { useState } from 'react';
import { AuditReport } from '../contracts/audit';
import { NoticeType } from '../contracts/notice';
import { generateStatutoryNotice } from '../core/notice-generator';

interface RemedyStudioProps {
  auditReport: AuditReport | null;
}

export const RemedyStudio: React.FC<RemedyStudioProps> = ({ auditReport }) => {
  const [activeTab, setActiveTab] = useState<NoticeType>('ClickToCancelDemand');
  const [subscriberName, setSubscriberName] = useState('Jane Doe');
  const [vendorName, setVendorName] = useState('Titan Fitness / StreamFlix');
  const [accountIdentifier, setAccountIdentifier] = useState('subscriber@example.com');
  const [disputedAmount, setDisputedAmount] = useState('49.99');
  const [copied, setCopied] = useState(false);

  // Extract cited unlawful provisions if available
  const citedClauses =
    auditReport?.clauses
      .filter((c) => c.severity === 'Unlawful')
      .map((c) => `${c.heading}: ${c.statutoryCitation || '16 CFR Part 425'} - ${c.trapName || 'Unlawful cancellation hurdle'}`) || [];

  const notice = generateStatutoryNotice(activeTab, {
    subscriberName,
    vendorName,
    accountIdentifier,
    jurisdiction: auditReport?.jurisdiction || 'CA',
    cancellationDate: new Date().toISOString().split('T')[0],
    disputedAmount,
    unlawfulClausesCited: citedClauses,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notice.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <aside className="remedy-rail" aria-label="Remedy and Notice Studio">
      <div className="rail-heading">
        <span aria-hidden="true">🛡️</span>
        <span>Remedy & Action Studio</span>
      </div>

      <div className="remedy-tabs" role="tablist" aria-label="Remedy notice types">
        <button
          type="button"
          className={`remedy-tab ${activeTab === 'ClickToCancelDemand' ? 'active' : ''}`}
          onClick={() => setActiveTab('ClickToCancelDemand')}
          role="tab"
          aria-selected={activeTab === 'ClickToCancelDemand'}
        >
          Cancel Demand
        </button>
        <button
          type="button"
          className={`remedy-tab ${activeTab === 'FTCComplaint' ? 'active' : ''}`}
          onClick={() => setActiveTab('FTCComplaint')}
          role="tab"
          aria-selected={activeTab === 'FTCComplaint'}
        >
          FTC Complaint
        </button>
        <button
          type="button"
          className={`remedy-tab ${activeTab === 'UnconditionalGiftClawback' ? 'active' : ''}`}
          onClick={() => setActiveTab('UnconditionalGiftClawback')}
          role="tab"
          aria-selected={activeTab === 'UnconditionalGiftClawback'}
        >
          Gift Restitution
        </button>
      </div>

      {/* Editable Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--surface-card)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <div>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
            Your Name
          </label>
          <input
            type="text"
            value={subscriberName}
            onChange={(e) => setSubscriberName(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.78rem', padding: '0.25rem 0.45rem', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
            Merchant Name
          </label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.78rem', padding: '0.25rem 0.45rem', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
            Account / Email
          </label>
          <input
            type="text"
            value={accountIdentifier}
            onChange={(e) => setAccountIdentifier(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.78rem', padding: '0.25rem 0.45rem', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
            Disputed Charge ($)
          </label>
          <input
            type="text"
            value={disputedAmount}
            onChange={(e) => setDisputedAmount(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.78rem', padding: '0.25rem 0.45rem', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--cyan-text)', fontFamily: 'var(--font-mono)' }}>
        Statutory Basis: {notice.statutoryBasis}
      </div>

      <div className="notice-box" role="region" aria-label="Generated Statutory Notice">
        {notice.content}
      </div>

      <div className="remedy-actions">
        <button
          type="button"
          className="action-btn primary"
          onClick={handleCopy}
          title="Copy formatted notice to clipboard"
        >
          <span aria-hidden="true">{copied ? '✓' : '📋'}</span>
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Notice'}</span>
        </button>

        <button
          type="button"
          className="action-btn"
          onClick={handlePrint}
          title="Print unbranded formal letter for USPS Certified Mail"
        >
          <span aria-hidden="true">🖨️</span>
          <span>Print / Save PDF</span>
        </button>
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
        💡 <strong>Certified Mail Tip:</strong> When dealing with uncooperative vendors, printing this notice and sending via USPS Certified Mail with Return Receipt provides definitive legal proof of cancellation under federal law.
      </p>
    </aside>
  );
};
