import React from 'react';
import { JurisdictionCode } from '../contracts/statute';

interface HeaderProps {
  selectedJurisdiction: JurisdictionCode;
  onJurisdictionChange: (code: JurisdictionCode) => void;
  onBurnData: () => void;
  sidecarActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedJurisdiction,
  onJurisdictionChange,
  onBurnData,
  sidecarActive,
}) => {
  return (
    <header className="app-header" role="banner">
      <div className="brand-section">
        <span className="brand-logo" aria-hidden="true">⚖️</span>
        <div className="brand-title-wrap">
          <h1>BillOfRightsBot</h1>
          <p className="brand-subtitle">FTC "Click-to-Cancel" & State ARL Subscription Auditor</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="air-gap-badge" title="Zero outbound network requests. All evaluation executes in local browser memory.">
          <span className="air-gap-dot" aria-hidden="true"></span>
          <span>100% Local-First</span>
        </div>

        {sidecarActive && (
          <div className="air-gap-badge" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#7dd3fc', background: 'rgba(56, 189, 248, 0.1)' }} title="Local sidecar active at localhost:8000">
            <span className="air-gap-dot" style={{ background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} aria-hidden="true"></span>
            <span>Sidecar Paired</span>
          </div>
        )}

        <label htmlFor="jurisdiction-select" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Select Jurisdiction
        </label>
        <select
          id="jurisdiction-select"
          className="jurisdiction-select"
          value={selectedJurisdiction}
          onChange={(e) => onJurisdictionChange(e.target.value as JurisdictionCode)}
          title="Select jurisdiction for statutory evaluation rules"
        >
          <option value="CA">California (AB 390 / SB 313 / AB 2863)</option>
          <option value="FTC">Federal Baseline Only (FTC / ROSCA)</option>
          <option value="NY">New York (GBL § 527-a)</option>
          <option value="IL">Illinois (815 ILCS 601/)</option>
          <option value="CO">Colorado (C.R.S. § 6-1-732)</option>
          <option value="DE">Delaware (6 Del. C. § 2734)</option>
        </select>

        <button
          type="button"
          className="burn-btn"
          onClick={onBurnData}
          title="Instantly flush all text, parsed clauses, and session state from memory"
        >
          <span aria-hidden="true">🔥</span>
          <span>Burn Local Data</span>
        </button>
      </div>
    </header>
  );
};
