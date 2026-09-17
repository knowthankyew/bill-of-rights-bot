import React, { useRef } from 'react';

interface AgreementWorkspaceProps {
  termsText: string;
  onTermsTextChange: (text: string) => void;
  onAudit: () => void;
  onLoadSample: (sampleKey: 'gym' | 'streaming' | 'saas' | 'compliant') => void;
  isAuditing: boolean;
}

export const AgreementWorkspace: React.FC<AgreementWorkspaceProps> = ({
  termsText,
  onTermsTextChange,
  onAudit,
  onLoadSample,
  isAuditing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTermsTextChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTermsTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="workspace-card-wrap">
      {/* Samples Toolbar */}
      <div className="samples-toolbar" role="toolbar" aria-label="Sample Agreements">
        <span className="samples-label">Load Predatory Sample:</span>
        <button
          type="button"
          className="sample-chip"
          onClick={() => onLoadSample('gym')}
          title="Planet Fitness style: phone & certified mail trap with 60-day advance window"
        >
          🏋️ Titan Gym (Phone Trap)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => onLoadSample('streaming')}
          title="Streaming video app: free trial conversion & unilateral price hikes"
        >
          🎬 StreamFlix (Trial Conversion)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => onLoadSample('saas')}
          title="Cloud software: mandatory exit surveys and retention manager gauntlet"
        >
          💼 CloudWork (Saves Maze)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => onLoadSample('compliant')}
          title="Statutorily compliant ToS with immediate 1-click online cancellation"
        >
          ✅ Transparent (Compliant)
        </button>
      </div>

      {/* Ingestion Dropzone & Text Area */}
      <div
        className="input-card"
        style={{ marginTop: '0.85rem' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="input-header">
          <h2 className="input-title">
            <span aria-hidden="true">📄</span>
            <span>Agreement Input / ToS Ingestion</span>
          </h2>
          <span className="char-counter">
            {termsText.length.toLocaleString()} characters
          </span>
        </div>

        <label htmlFor="terms-input" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Paste subscription terms or agreement text
        </label>
        <textarea
          id="terms-input"
          className="terms-textarea"
          placeholder="Paste Terms of Service, subscription agreement, or cancellation policy here, or drop a .txt/.md file..."
          value={termsText}
          onChange={(e) => onTermsTextChange(e.target.value)}
          rows={7}
        />

        <div className="input-actions">
          <div>
            <button
              type="button"
              className="file-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <span aria-hidden="true">📂</span>
              <span>Upload Agreement (.txt, .md, .html)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.html,.htm,.rtf"
              className="file-upload-input"
              onChange={handleFileUpload}
            />
          </div>

          <button
            type="button"
            className="audit-btn"
            onClick={onAudit}
            disabled={termsText.trim().length === 0 || isAuditing}
          >
            <span aria-hidden="true">⚖️</span>
            <span>{isAuditing ? 'Evaluating Statutes...' : 'Audit Agreement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
