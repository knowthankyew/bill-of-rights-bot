import React, { useRef, useState } from 'react';
import { performLocalOcr, OcrProgress } from '../core/ocr-engine';

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
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isOcrActive, setIsOcrActive] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setOcrError(null);

    // Check if the file is an image
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name)) {
      setIsOcrActive(true);
      setOcrProgress({ status: 'Starting local in-browser OCR...', progress: 0.05 });

      try {
        const extractedText = await performLocalOcr(file, (info) => {
          setOcrProgress(info);
        });

        if (extractedText.trim().length > 0) {
          onTermsTextChange(extractedText);
          // Small timeout to allow state to settle before audit
          setTimeout(() => {
            onAudit();
          }, 100);
        } else {
          setOcrError('No legible text detected in image. Please try a clearer or higher-contrast photo.');
        }
      } catch (err: any) {
        setOcrError(err.message || 'Failed to extract text via local OCR.');
      } finally {
        setIsOcrActive(false);
        setOcrProgress(null);
      }
      return;
    }

    // Otherwise handle text / document files
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTermsTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
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
            <span>Agreement Input / Text & Photo Ingestion</span>
          </h2>
          <span className="char-counter">
            {termsText.length.toLocaleString()} characters
          </span>
        </div>

        {/* OCR Progress Banner */}
        {isOcrActive && ocrProgress && (
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid var(--cyan-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--cyan-text)', fontWeight: 600 }}>
              <span>📷 100% Local In-Browser OCR: {ocrProgress.status}</span>
              <span>{Math.round(ocrProgress.progress * 100)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round(ocrProgress.progress * 100)}%`,
                  height: '100%',
                  background: 'var(--cyan-accent)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {ocrError && (
          <div style={{ background: 'var(--crimson-bg)', border: '1px solid var(--crimson-border)', color: 'var(--crimson-text)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            ⚠️ {ocrError}
          </div>
        )}

        <label htmlFor="terms-input" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Paste subscription terms, upload an agreement file, or drop a contract photo
        </label>
        <textarea
          id="terms-input"
          className="terms-textarea"
          placeholder="Paste Terms of Service text, upload a document, or drop a contract photo (.png, .jpg, .webp) for 100% local in-browser OCR..."
          value={termsText}
          onChange={(e) => onTermsTextChange(e.target.value)}
          rows={7}
          disabled={isOcrActive}
        />

        <div className="input-actions">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="file-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrActive}
            >
              <span aria-hidden="true">📂</span>
              <span>Upload Document (.txt, .md, .html)</span>
            </button>

            <button
              type="button"
              className="file-upload-btn"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--cyan-text)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrActive}
              title="Select a photo of a contract for 100% local, offline in-browser OCR"
            >
              <span aria-hidden="true">📷</span>
              <span>Snap/Drop Photo (Local OCR)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.html,.htm,.rtf,image/*,.jpg,.jpeg,.png,.webp,.bmp"
              className="file-upload-input"
              onChange={handleFileUpload}
            />
          </div>

          <button
            type="button"
            className="audit-btn"
            onClick={onAudit}
            disabled={termsText.trim().length === 0 || isAuditing || isOcrActive}
          >
            <span aria-hidden="true">⚖️</span>
            <span>{isAuditing ? 'Evaluating Statutes...' : 'Audit Agreement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
