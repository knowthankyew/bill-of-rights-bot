import { describe, it, expect, vi } from 'vitest';
import {
  isPdfFile,
  isPdfBuffer,
  reconstructTextFromContent,
  shouldFallbackToOcr,
  registerPdfBuffer,
  purgePdfMemory,
  extractTextFromPdf,
  DEFAULT_PAGE_CAP,
  MIN_DIGITAL_CHAR_THRESHOLD,
} from '../../src/core/pdf-engine';
import { terminateOcrWorker } from '../../src/core/ocr-engine';

describe('pdf-engine: detection', () => {
  it('identifies PDF files by application/pdf MIME type', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'contract.dat' })).toBe(true);
  });

  it('identifies PDF files by .pdf extension (case-insensitive)', () => {
    expect(isPdfFile({ type: '', name: 'membership-agreement.pdf' })).toBe(true);
    expect(isPdfFile({ type: 'application/octet-stream', name: 'TERMS.PDF' })).toBe(true);
    expect(isPdfFile({ name: 'scan_2026.Pdf' })).toBe(true);
  });

  it('rejects non-PDF files', () => {
    expect(isPdfFile({ type: 'image/png', name: 'contract.png' })).toBe(false);
    expect(isPdfFile({ type: 'text/plain', name: 'terms.txt' })).toBe(false);
    expect(isPdfFile({ type: '', name: 'document.docx' })).toBe(false);
    expect(isPdfFile({} as any)).toBe(false);
    expect(isPdfFile(null as any)).toBe(false);
  });

  it('identifies PDF buffer headers (%PDF-)', () => {
    const validHeader = new TextEncoder().encode('%PDF-1.7\n%some data').buffer;
    expect(isPdfBuffer(validHeader)).toBe(true);

    const invalidHeader = new TextEncoder().encode('GIF89a\x00\x00').buffer;
    expect(isPdfBuffer(invalidHeader)).toBe(false);

    const tooShort = new TextEncoder().encode('%PD').buffer;
    expect(isPdfBuffer(tooShort)).toBe(false);
  });
});

describe('pdf-engine: digital text reconstruction', () => {
  it('returns empty string when given empty or null items', () => {
    expect(reconstructTextFromContent([])).toBe('');
    expect(reconstructTextFromContent(null as any)).toBe('');
  });

  it('reconstructs text on the same line with natural horizontal spacing', () => {
    const items = [
      { str: 'SECTION', transform: [10, 0, 0, 10, 50, 700], width: 45, height: 10 },
      { str: '1.', transform: [10, 0, 0, 10, 100, 700], width: 10, height: 10 },
      { str: 'AUTOMATIC', transform: [10, 0, 0, 10, 115, 700], width: 60, height: 10 },
      { str: 'RENEWAL', transform: [10, 0, 0, 10, 180, 700], width: 55, height: 10 },
    ];

    const result = reconstructTextFromContent(items);
    expect(result).toBe('SECTION 1. AUTOMATIC RENEWAL');
  });

  it('does not insert double spaces if items already have trailing or leading whitespace', () => {
    const items = [
      { str: 'Monthly fee of ', transform: [10, 0, 0, 10, 50, 700], width: 80, height: 10 },
      { str: '$49.99 billed', transform: [10, 0, 0, 10, 130, 700], width: 70, height: 10 },
      { str: ' automatically.', transform: [10, 0, 0, 10, 200, 700], width: 80, height: 10 },
    ];

    const result = reconstructTextFromContent(items);
    expect(result).toBe('Monthly fee of $49.99 billed automatically.');
  });

  it('reconstructs single line breaks vs paragraph breaks based on vertical coordinate delta', () => {
    const items = [
      // Line 1
      { str: 'Paragraph 1 line A.', transform: [10, 0, 0, 10, 50, 700], width: 100, height: 10 },
      // Line 2 (normal line break: delta = 12pt)
      { str: 'Paragraph 1 line B.', transform: [10, 0, 0, 10, 50, 688], width: 100, height: 10 },
      // Line 3 (paragraph break: delta = 28pt)
      { str: 'Paragraph 2 heading.', transform: [10, 0, 0, 10, 50, 660], width: 100, height: 10 },
    ];

    const result = reconstructTextFromContent(items);
    expect(result).toBe('Paragraph 1 line A.\nParagraph 1 line B.\n\nParagraph 2 heading.');
  });

  it('honors hasEOL flags as explicit line boundaries', () => {
    const items = [
      { str: 'First sentence.', transform: [10, 0, 0, 10, 50, 700], width: 80, height: 10, hasEOL: true },
      { str: 'Second sentence.', transform: [10, 0, 0, 10, 50, 690], width: 80, height: 10 },
    ];

    const result = reconstructTextFromContent(items);
    expect(result).toBe('First sentence.\nSecond sentence.');
  });
});

describe('pdf-engine: sparse-page fallback routing', () => {
  it('routes to Fast Path when legible characters >= 50', () => {
    const searchableText =
      'This subscription will automatically renew every month unless you cancel 30 days prior.';
    expect(searchableText.length).toBeGreaterThan(50);
    expect(shouldFallbackToOcr(searchableText)).toBe(false);
  });

  it('routes to Deep Path (OCR) when text has < 50 characters (e.g. empty or micro headers)', () => {
    expect(shouldFallbackToOcr('')).toBe(true);
    expect(shouldFallbackToOcr('   \n  \t  ')).toBe(true);
    expect(shouldFallbackToOcr('Page 1 of 5')).toBe(true); // 9 characters
    expect(shouldFallbackToOcr('CONFIDENTIAL')).toBe(true); // 12 characters
  });

  it('respects custom minimum character thresholds', () => {
    const text = 'Short notice with 25 characters.';
    expect(shouldFallbackToOcr(text, 20)).toBe(false);
    expect(shouldFallbackToOcr(text, 100)).toBe(true);
  });
});

describe('pdf-engine: memory safeguards & nuclear amnesia', () => {
  it('zeroes registered ArrayBuffers upon purgePdfMemory()', async () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    registerPdfBuffer(buffer);

    const viewBefore = new Uint8Array(buffer);
    expect(viewBefore[0]).toBe(1);
    expect(viewBefore[7]).toBe(8);

    await purgePdfMemory();

    const viewAfter = new Uint8Array(buffer);
    expect(viewAfter[0]).toBe(0);
    expect(viewAfter[7]).toBe(0);
  });

  it('triggers purgePdfMemory when terminateOcrWorker() is invoked', async () => {
    const buffer = new Uint8Array([42, 42, 42, 42]).buffer;
    registerPdfBuffer(buffer);

    await terminateOcrWorker();

    const view = new Uint8Array(buffer);
    expect(view[0]).toBe(0);
    expect(view[3]).toBe(0);
  });

  it('has DEFAULT_PAGE_CAP of 20 pages', () => {
    expect(DEFAULT_PAGE_CAP).toBe(20);
    expect(MIN_DIGITAL_CHAR_THRESHOLD).toBe(50);
  });
});

describe('pdf-engine: extractTextFromPdf end-to-end execution', () => {
  // Construct a minimal valid 1-page PDF with text stream (> 50 legible characters)
  const digitalTextPdf =
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n' +
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    '5 0 obj\n<< /Length 170 >>\nstream\n' +
    'BT\n/F1 12 Tf\n72 712 Td\n(SECTION 1. AUTOMATIC RENEWAL TERMS AND CONDITIONS) Tj\n' +
    '0 -20 Td\n(This subscription agreement automatically renews every single month.) Tj\nET\n' +
    'endstream\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000228 00000 n \n0000000305 00000 n \n' +
    'trailer\n<< /Size 6 /Root 1 0 R >>\n' +
    'startxref\n528\n%%EOF';

  // Construct a minimal valid 1-page blank PDF (0 characters)
  const sparseBlankPdf =
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer<</Size 4/Root 1 0 R>>\n' +
    'startxref\n206\n%%EOF';

  it('routes digital text PDF to Path A (Fast Path) without calling OCR engine', async () => {
    const pdfBuffer = new TextEncoder().encode(digitalTextPdf).buffer;
    const progressEvents: any[] = [];
    const mockRasterizer = vi.fn();
    const mockOcr = vi.fn();

    const result = await extractTextFromPdf(pdfBuffer, {
      customRasterizer: mockRasterizer,
      ocrEngine: mockOcr,
      onProgress: (info) => progressEvents.push(info),
    });

    expect(result.totalPages).toBe(1);
    expect(result.pagesProcessed).toBe(1);
    expect(result.mode).toBe('digital');
    expect(result.text).toContain('SECTION 1. AUTOMATIC RENEWAL');
    expect(mockRasterizer).not.toHaveBeenCalled();
    expect(mockOcr).not.toHaveBeenCalled();

    const digitalEvents = progressEvents.filter((e) => e.phase === 'digital');
    expect(digitalEvents.length).toBeGreaterThan(0);
  });

  it('routes sparse/empty PDF page to Path B (Deep Path / OCR) and invokes rasterizer & OCR', async () => {
    const pdfBuffer = new TextEncoder().encode(sparseBlankPdf).buffer;
    const progressEvents: any[] = [];
    const mockRasterizer = vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));
    const mockOcr = vi.fn().mockResolvedValue('SCANNED CONTRACT CLAUSE IDENTIFIED VIA OCR');

    const result = await extractTextFromPdf(pdfBuffer, {
      customRasterizer: mockRasterizer,
      ocrEngine: mockOcr,
      onProgress: (info) => progressEvents.push(info),
    });

    expect(result.totalPages).toBe(1);
    expect(result.pagesProcessed).toBe(1);
    expect(result.hasMorePages).toBe(false);
    expect(mockRasterizer).toHaveBeenCalledTimes(1);
    expect(mockOcr).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe('ocr');
    expect(result.text).toBe('SCANNED CONTRACT CLAUSE IDENTIFIED VIA OCR');

    // Confirm progress events tracked OCR phase
    const ocrEvents = progressEvents.filter((e) => e.phase === 'ocr');
    expect(ocrEvents.length).toBeGreaterThan(0);
  });

  it('respects page caps and reports continuation affordance metadata', async () => {
    const pdfBuffer = new TextEncoder().encode(digitalTextPdf).buffer;

    const result = await extractTextFromPdf(pdfBuffer, {
      startPage: 1,
      maxPages: 1,
    });

    expect(result.totalPages).toBe(1);
    expect(result.pagesProcessed).toBe(1);
    expect(result.hasMorePages).toBe(false);
  });
});

describe('pdf-engine: air-gap and zero-egress invariant', () => {
  it('makes zero external HTTP/HTTPS network calls during document extraction', async () => {
    const digitalPdfBuffer = new TextEncoder().encode(
      '%PDF-1.4\n' +
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n' +
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
      '5 0 obj\n<< /Length 120 >>\nstream\n' +
      'BT /F1 12 Tf 72 712 Td (Cancellation parity required under 16 CFR Part 425 and federal law.) Tj ET\nendstream\nendobj\n' +
      'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000228 00000 n \n0000000305 00000 n \n' +
      'trailer\n<< /Size 6 /Root 1 0 R >>\n' +
      'startxref\n450\n%%EOF'
    ).buffer;

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await extractTextFromPdf(digitalPdfBuffer, {
      startPage: 1,
      maxPages: 1,
      customRasterizer: vi.fn(),
    });

    const externalCalls = fetchSpy.mock.calls.filter(([url]) => {
      const urlStr = String(url);
      return !urlStr.startsWith('/') && !urlStr.startsWith('http://localhost') && !urlStr.startsWith('http://127.0.0.1');
    });

    expect(externalCalls.length).toBe(0);
    fetchSpy.mockRestore();
  });
});

