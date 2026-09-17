import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatuteRail } from './components/StatuteRail';
import { StatuteModal } from './components/StatuteModal';
import { AgreementWorkspace } from './components/AgreementWorkspace';
import { Scorecard } from './components/Scorecard';
import { ClauseCardGrid } from './components/ClauseCardGrid';
import { RemedyStudio } from './components/RemedyStudio';

import { JurisdictionCode, StatuteDataset } from './contracts/statute';
import { AuditReport } from './contracts/audit';
import { segmentClauses } from './core/segmenter';
import { evaluateAgreement } from './core/rule-engine';
import { probeLocalSidecar } from './core/sidecar-client';
import { terminateOcrWorker } from './core/ocr-engine';

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
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

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
    const candidateClauses = segmentClauses(text);
    const report = evaluateAgreement(candidateClauses, jurisdiction);
    setAuditReport(report);
    setIsAuditing(false);

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

      <Header
        selectedJurisdiction={selectedJurisdiction}
        onJurisdictionChange={handleJurisdictionChange}
        onBurnData={handleBurnData}
        sidecarActive={sidecarActive}
      />

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
    </div>
  );
};
