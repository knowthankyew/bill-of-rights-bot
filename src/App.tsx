import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatuteRail } from './components/StatuteRail';
import { StatuteModal } from './components/StatuteModal';
import { AgreementWorkspace } from './components/AgreementWorkspace';
import { Scorecard } from './components/Scorecard';
import { ClauseCardGrid } from './components/ClauseCardGrid';
import { RemedyStudio } from './components/RemedyStudio';
import { PrivacyAuditModal } from './components/PrivacyAuditModal';

import { JurisdictionCode, StatuteDataset } from './contracts/statute';
import { AuditReport } from './contracts/audit';
import { segmentClauses } from './core/segmenter';
import { evaluateAgreement } from './core/rule-engine';
import { probeLocalSidecar } from './core/sidecar-client';
import { terminateOcrWorker } from './core/ocr-engine';
import { telemetry } from './core/telemetry';

import gymSample from '../data/samples/gym-membership.txt?raw';
import streamingSample from '../data/samples/streaming-service.txt?raw';
import saasSample from '../data/samples/saas-cloud-contract.txt?raw';
import compliantSample from '../data/samples/compliant-agreement.txt?raw';

export const App: React.FC = () => {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<JurisdictionCode>('CA');
  const [termsText, setTermsText] = useState<string>(gymSample);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [inspectedStatute, setInspectedStatute] = useState<StatuteDataset | null>(null);
  const [sidecarActive, setSidecarActive] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isPrivacyAuditOpen, setIsPrivacyAuditOpen] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const claims = telemetry.getPrivacyClaims();

  // Probe local sidecar on startup (non-blocking, loopback only)
  useEffect(() => {
    probeLocalSidecar().then((status) => {
      setSidecarActive(status.isAvailable);
    });

    // Run initial audit on the seed gym sample
    runAudit(gymSample, selectedJurisdiction);
  }, []);

  const runAudit = (text: string, jurisdiction: JurisdictionCode) => {
    if (!text.trim()) {
      setAuditReport(null);
      return;
    }

    setIsAuditing(true);
    const span = telemetry.startSpan('evaluate_subscription_agreement', {
      jurisdiction,
      char_count: text.length,
    });
    telemetry.recordAuditEvent('document_ingested', `Ingested agreement text (${text.length} chars)`, {
      jurisdiction,
      char_count: text.length,
    });

    const candidateClauses = segmentClauses(text);
    const report = evaluateAgreement(candidateClauses, jurisdiction);
    setAuditReport(report);
    setIsAuditing(false);

    telemetry.recordAuditEvent('rules_evaluated', `Evaluated ${report.clauses.length} clauses against ${jurisdiction} statutes`, {
      total_clauses: report.clauses.length,
      unlawful_count: report.summary.unlawfulCount,
      watch_count: report.summary.watchCount,
    });

    span.end('OK', {
      total_clauses: report.clauses.length,
      unlawful_count: report.summary.unlawfulCount,
      watch_count: report.summary.watchCount,
    });

    setLiveAnnouncement(
      `Audit completed. Evaluated ${report.clauses.length} clauses. Identified ${report.summary.unlawfulCount} unlawful traps and ${report.summary.watchCount} watch clauses.`
    );
  };

  const handleAuditClick = () => {
    runAudit(termsText, selectedJurisdiction);
  };

  const handleJurisdictionChange = (code: JurisdictionCode) => {
    setSelectedJurisdiction(code);
    if (termsText.trim()) {
      runAudit(termsText, code);
    }
  };

  const handleLoadSample = (sampleKey: 'gym' | 'streaming' | 'saas' | 'compliant') => {
    telemetry.restartSession();
    let sample = '';
    switch (sampleKey) {
      case 'gym':
        sample = gymSample;
        break;
      case 'streaming':
        sample = streamingSample;
        break;
      case 'saas':
        sample = saasSample;
        break;
      case 'compliant':
        sample = compliantSample;
        break;
    }
    setTermsText(sample);
    runAudit(sample, selectedJurisdiction);
  };

  const handleBurnData = () => {
    telemetry.burn();
    terminateOcrWorker();
    setTermsText('');
    setAuditReport(null);
    setInspectedStatute(null);
    setLiveAnnouncement('All local agreement data and session memory purged successfully.');
  };

  return (
    <div className="app-container">
      {/* Screen reader live announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {liveAnnouncement}
      </div>

      {claims.isEnterpriseBuild && (
        <div className="enterprise-persistent-banner" role="alert" style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', color: '#92400e', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 500, zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>
              <strong>Enterprise Mode:</strong> Telemetry exporter active ({claims.badgeLabel}). Operational metadata exported to <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 4px', borderRadius: '4px' }}>{claims.otlpEndpoint}</code>. Agreement text strictly redacted.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivacyAuditOpen(true)}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, background: '#fde68a', color: '#78350f', border: '1px solid #f59e0b', borderRadius: '4px', cursor: 'pointer' }}
          >
            Inspect Telemetry
          </button>
        </div>
      )}

      <Header
        selectedJurisdiction={selectedJurisdiction}
        onJurisdictionChange={handleJurisdictionChange}
        onBurnData={handleBurnData}
        onOpenPrivacyAudit={() => setIsPrivacyAuditOpen(true)}
        sidecarActive={sidecarActive}
      />

      <div className="disclaimer-banner" role="note" style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', padding: '0.45rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <strong>Notice:</strong> BillOfRightsBot is an educational reality engine, not a law firm. {claims.disclaimerExecutionText}
      </div>

      <main className="studio-layout">
        {/* Left Rail: Statutes */}
        <StatuteRail
          selectedJurisdiction={selectedJurisdiction}
          onInspectStatute={(statute) => setInspectedStatute(statute)}
        />

        {/* Center Canvas */}
        <section className="center-canvas" aria-label="Agreement Workspace">
          <AgreementWorkspace
            termsText={termsText}
            onTermsTextChange={setTermsText}
            onAudit={handleAuditClick}
            onLoadSample={handleLoadSample}
            isAuditing={isAuditing}
          />

          {auditReport && (
            <>
              <Scorecard summary={auditReport.summary} />
              <ClauseCardGrid clauses={auditReport.clauses} />
            </>
          )}

          {!auditReport && termsText.trim().length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Agreement Loaded
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '450px', margin: '0 auto' }}>
                Paste terms text above, upload an agreement file, or select one of the predatory subscription samples to audit compliance against FTC Click-to-Cancel and state auto-renewal statutes.
              </p>
            </div>
          )}
        </section>

        {/* Right Rail: Remedy Studio */}
        <RemedyStudio auditReport={auditReport} />
      </main>

      {/* Statute Inspector Modal */}
      <StatuteModal
        statute={inspectedStatute}
        onClose={() => setInspectedStatute(null)}
      />

      {/* Privacy & Telemetry Verification Modal */}
      <PrivacyAuditModal
        isOpen={isPrivacyAuditOpen}
        onClose={() => setIsPrivacyAuditOpen(false)}
        onBurnData={handleBurnData}
      />

      {/* Footer with honest claims */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-header)', padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)' }}>
          <strong>BillOfRightsBot{claims.appTitleSuffix}</strong> — {claims.footerTitle}
        </p>
        <p style={{ margin: 0 }}>
          {claims.footerSubtext}
        </p>
      </footer>
    </div>
  );
};
