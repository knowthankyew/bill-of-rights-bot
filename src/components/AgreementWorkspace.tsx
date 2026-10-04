import React, { useRef, useState, useEffect } from 'react';
import { performLocalOcr, OcrProgress } from '../core/ocr-engine';
import {
  extractTextFromPdf,
  isPdfFile,
  PdfProgressInfo,
} from '../core/pdf-engine';

interface AgreementWorkspaceProps {
  termsText: string;
  onTermsTextChange: (text: string) => void;
  onAudit: () => void;
  onLoadSample: (sampleKey: 'gym' | 'streaming' | 'saas' | 'compliant') => void;
  isAuditing: boolean;
}

interface PdfPaginationState {
  hasMore: boolean;
  nextStartPage: number;
  totalPages: number;
}

export const AgreementWorkspace: React.FC<AgreementWorkspaceProps> = ({
  termsText,
  onTermsTextChange,
  onAudit,
  onLoadSample,
  isAuditing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General processing and progress tracking
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [pdfProgress, setPdfProgress] = useState<PdfProgressInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingestion provenance badge & pagination
  const [ingestionBadge, setIngestionBadge] = useState<string | null>(null);
  const [activePdfFile, setActivePdfFile] = useState<File | null>(null);
  const [pdfPagination, setPdfPagination] = useState<PdfPaginationState | null>(null);

  // When terms text is cleared (e.g., Burn Local Data), reset ephemeral states
  useEffect(() => {
    if (!termsText.trim()) {
      setIngestionBadge(null);
      setActivePdfFile(null);
      setPdfPagination(null);
      setErrorMessage(null);
    }
  }, [termsText]);

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // Guard against massive files exhausting browser tab RAM
    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File "${file.name}" exceeds the 50MB safety limit. For browser stability, please upload a smaller agreement or excerpt.`);
      return;
    }

    // 1. PDF Documents (Dual-Path Engine: Fast Path Digital Text or Deep Path Local OCR)
    if (isPdfFile(file)) {
      setIsProcessing(true);
      setActivePdfFile(file);
      setPdfPagination(null);
      setPdfProgress({
        page: 1,
        totalPages: 1,
        phase: 'digital',
        percent: 5,
        statusText: 'Initializing air-gapped PDF engine...',
      });

      try {
        const result = await extractTextFromPdf(file, {
          startPage: 1,
          maxPages: 20,
          onProgress: (prog) => {
            setPdfProgress(prog);
          },
        });

        if (result.text.trim().length > 0) {
          onTermsTextChange(result.text);

          // Set visual ingestion mode badge
          if (result.mode === 'digital') {
            setIngestionBadge('[PDF Text Stream]');
          } else if (result.mode === 'ocr') {
            setIngestionBadge('[PDF Local OCR]');
          } else {
            setIngestionBadge('[PDF Hybrid OCR]');
          }

          // Setup continuation pagination if capped
          if (result.hasMorePages) {
            setPdfPagination({
              hasMore: true,
              nextStartPage: result.pagesProcessed + 1,
              totalPages: result.totalPages,
            });
          } else {
            setPdfPagination(null);
          }

          setTimeout(() => {
            onAudit();
          }, 100);
        } else {
          setErrorMessage('No legible text could be extracted from this PDF document.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to ingest PDF document.');
      } finally {
        setIsProcessing(false);
        setPdfProgress(null);
      }
      return;
    }

    // 2. Physical Contract Photos & Standalone Images (Direct OCR)
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name)) {
      setIsProcessing(true);
      setActivePdfFile(null);
      setPdfPagination(null);
      setOcrProgress({ status: 'Starting local in-browser OCR...', progress: 0.05 });

      try {
        const extractedText = await performLocalOcr(file, (info) => {
          setOcrProgress(info);
        });

        if (extractedText.trim().length > 0) {
          setIngestionBadge('[Photo Local OCR]');
          onTermsTextChange(extractedText);
          setTimeout(() => {
            onAudit();
          }, 100);
        } else {
          setErrorMessage('No legible text detected in image. Please try a clearer or higher-contrast photo.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to extract text via local OCR.');
      } finally {
        setIsProcessing(false);
        setOcrProgress(null);
      }
      return;
    }

    // 3. Plain Text / Markdown / HTML / RTF Documents
    setActivePdfFile(null);
    setPdfPagination(null);
    setIngestionBadge(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTermsTextChange(content);
        setTimeout(() => {
          onAudit();
        }, 100);
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyzeNextPages = async () => {
    if (!activePdfFile || !pdfPagination) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setPdfProgress({
      page: pdfPagination.nextStartPage,
      totalPages: pdfPagination.totalPages,
      phase: 'digital',
      percent: 5,
      statusText: `Preparing page ${pdfPagination.nextStartPage}...`,
    });

    try {
      const nextResult = await extractTextFromPdf(activePdfFile, {
        startPage: pdfPagination.nextStartPage,
        maxPages: 10,
        onProgress: (prog) => {
          setPdfProgress(prog);
        },
      });

      if (nextResult.text.trim().length > 0) {
        const combinedText = termsText.trim() + '\n\n' + nextResult.text.trim();
        onTermsTextChange(combinedText);

        if (nextResult.hasMorePages) {
          setPdfPagination({
            hasMore: true,
            nextStartPage: nextResult.pagesProcessed + 1,
            totalPages: nextResult.totalPages,
          });
        } else {
          setPdfPagination(null);
        }

        setTimeout(() => {
          onAudit();
        }, 100);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze subsequent PDF pages.');
    } finally {
      setIsProcessing(false);
      setPdfProgress(null);
    }
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

  const handleSampleClick = (sampleKey: 'gym' | 'streaming' | 'saas' | 'compliant') => {
    setIngestionBadge(null);
    setActivePdfFile(null);
    setPdfPagination(null);
    setErrorMessage(null);
    onLoadSample(sampleKey);
  };

  return (
    <div className="workspace-card-wrap">
      {/* Samples Toolbar */}
      <div className="samples-toolbar" role="toolbar" aria-label="Sample Agreements">
        <span className="samples-label">Load Predatory Sample:</span>
        <button
          type="button"
          className="sample-chip"
          onClick={() => handleSampleClick('gym')}
          title="Planet Fitness style: phone & certified mail trap with 60-day advance window"
        >
          🏋️ Titan Gym (Phone Trap)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => handleSampleClick('streaming')}
          title="Streaming video app: free trial conversion & unilateral price hikes"
        >
          🎬 StreamFlix (Trial Conversion)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => handleSampleClick('saas')}
          title="Cloud software: mandatory exit surveys and retention manager gauntlet"
        >
          💼 CloudWork (Saves Maze)
        </button>
        <button
          type="button"
          className="sample-chip"
          onClick={() => handleSampleClick('compliant')}
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
            <span>Agreement Input / Text, PDF & Photo Ingestion</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {ingestionBadge && (
              <span
                className="mode-badge"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  background: ingestionBadge.includes('OCR')
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(56, 189, 248, 0.15)',
                  color: ingestionBadge.includes('OCR')
                    ? 'var(--amber-text)'
                    : 'var(--cyan-text)',
                  border: ingestionBadge.includes('OCR')
                    ? '1px solid var(--amber-border)'
                    : '1px solid var(--cyan-border)',
                }}
              >
                {ingestionBadge}
              </span>
            )}
            <span className="char-counter">
              {termsText.length.toLocaleString()} characters
            </span>
          </div>
        </div>

        {/* PDF Extraction Progress Banner */}
        {isProcessing && pdfProgress && (
          <div
            className="pdf-progress-card"
            style={{
              background:
                pdfProgress.phase === 'ocr'
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(56, 189, 248, 0.12)',
              border:
                pdfProgress.phase === 'ocr'
                  ? '1px solid var(--amber-border)'
                  : '1px solid var(--cyan-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color:
                  pdfProgress.phase === 'ocr'
                    ? 'var(--amber-text)'
                    : 'var(--cyan-text)',
                fontWeight: 600,
              }}
            >
              <span>
                {pdfProgress.phase === 'ocr' ? '📷 Local In-Browser OCR' : '📄 Local PDF Ingestion'}:{' '}
                {pdfProgress.statusText || `Page ${pdfProgress.page} of ${pdfProgress.totalPages}`}
              </span>
              <span>{pdfProgress.percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pdfProgress.percent}%`,
                  height: '100%',
                  background:
                    pdfProgress.phase === 'ocr'
                      ? 'var(--amber-accent)'
                      : 'var(--cyan-accent)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Photo OCR Progress Banner (Direct Image Upload) */}
        {isProcessing && ocrProgress && !pdfProgress && (
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'var(--cyan-text)',
                fontWeight: 600,
              }}
            >
              <span>📷 100% Local In-Browser OCR: {ocrProgress.status}</span>
              <span>{Math.round(ocrProgress.progress * 100)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
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

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              background: 'var(--crimson-bg)',
              border: '1px solid var(--crimson-border)',
              color: 'var(--crimson-text)',
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <label
          htmlFor="terms-input"
          className="sr-only"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
          }}
        >
          Paste subscription terms, upload an agreement file, or drop a contract PDF or photo
        </label>
        <textarea
          id="terms-input"
          className="terms-textarea"
          placeholder="Paste Terms of Service text, upload a document (.pdf, .txt, .html), or drop a contract photo (.png, .jpg) for 100% air-gapped in-browser ingestion..."
          value={termsText}
          onChange={(e) => {
            onTermsTextChange(e.target.value);
            // Clear mode badge when manually edited
            if (ingestionBadge) {
              setIngestionBadge(null);
            }
          }}
          rows={7}
          disabled={isProcessing}
        />

        {/* Safety Page Cap Continuation Affordance */}
        {pdfPagination?.hasMore && (
          <div
            className="pdf-continuation-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--cyan-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: 'var(--cyan-text)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🛡️</span>
              <span>
                Ingested pages 1–{pdfPagination.nextStartPage - 1} of {pdfPagination.totalPages} (20-page safety cap applied).
              </span>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeNextPages}
              disabled={isProcessing}
              style={{
                background: 'var(--cyan-bg)',
                border: '1px solid var(--cyan-border)',
                color: 'var(--cyan-text)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isProcessing ? 'Analyzing...' : 'Analyze Next 10 Pages'}
            </button>
          </div>
        )}

        <div className="input-actions">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="file-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <span aria-hidden="true">📂</span>
              <span>Upload Document (.pdf, .txt, .md, .html)</span>
            </button>

            <button
              type="button"
              className="file-upload-btn"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--cyan-text)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Select a contract PDF or photo for 100% local, offline in-browser extraction"
            >
              <span aria-hidden="true">📷</span>
              <span>Snap/Drop Photo (Local OCR)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,.txt,.md,.html,.htm,.rtf,image/*,.jpg,.jpeg,.png,.webp,.bmp"
              className="file-upload-input"
              onChange={handleFileUpload}
            />
          </div>

          <button
            type="button"
            className="audit-btn"
            onClick={onAudit}
            disabled={termsText.trim().length === 0 || isAuditing || isProcessing}
          >
            <span aria-hidden="true">⚖️</span>
            <span>{isAuditing ? 'Evaluating Statutes...' : 'Audit Agreement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
