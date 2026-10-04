// Polyfill Promise.withResolvers for Node.js 20 and older browser environments
if (typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import { performLocalOcr, registerBurnHook } from './ocr-engine';

export interface PdfProgressInfo {
  page: number;
  totalPages: number;
  phase: 'digital' | 'ocr';
  percent: number; // 0 to 100
  statusText?: string;
}

export type PdfProgressCallback = (progress: PdfProgressInfo) => void;

export type IngestionMode = 'digital' | 'ocr' | 'hybrid';

export interface PageModeDetail {
  page: number;
  mode: 'digital' | 'ocr';
  charCount: number;
}

export interface PdfExtractionResult {
  text: string;
  totalPages: number;
  pagesProcessed: number;
  hasMorePages: boolean;
  mode: IngestionMode;
  pageModes: PageModeDetail[];
}

export interface PdfExtractionOptions {
  maxPages?: number; // default: 20
  startPage?: number; // default: 1
  dpi?: number; // default: 200 (200-300 DPI)
  minCharThreshold?: number; // default: 50
  onProgress?: PdfProgressCallback;
  customRasterizer?: (page: any, dpi: number) => Promise<Blob>;
  ocrEngine?: (image: Blob | string, onProgress?: (p: any) => void) => Promise<string>;
}

export interface TextItemLike {
  str: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  hasEOL?: boolean;
}

export const DEFAULT_PAGE_CAP = 20;
export const DEFAULT_DPI = 200;
export const MIN_DIGITAL_CHAR_THRESHOLD = 50;

// Active state registry for Nuclear Amnesia & cancellation
let activeLoadingTask: any = null;
let activePdfDoc: any = null;
const activeBuffers: Set<ArrayBuffer> = new Set();
let isCancellationRequested = false;

/**
 * Ensure Promise.withResolvers is polyfilled across all execution contexts.
 */
export function ensurePromiseWithResolvers(): void {
  if (typeof (Promise as any).withResolvers !== 'function') {
    (Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

/**
 * Configure local worker and resource URLs for 100% air-gapped offline operation.
 * All worker scripts, cmaps, and standard fonts are loaded from local /pdfjs/ paths.
 */
export function setupPdfWorker(): void {
  ensurePromiseWithResolvers();
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      `${normalizedBase}pdfjs/pdf.worker.min.mjs`,
      window.location.origin
    ).href;
  }
}

/**
 * Detect whether a file or descriptor is a PDF.
 */
export function isPdfFile(file: { type?: string; name?: string }): boolean {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  if (file.name && /\.pdf$/i.test(file.name)) return true;
  return false;
}

/**
 * Detect whether a binary buffer starts with the PDF magic signature (%PDF-).
 */
export function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer, 0, 5);
  return (
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 && // F
    header[4] === 0x2d    // -
  );
}

/**
 * Register an ArrayBuffer in active memory to track for nuclear purge.
 */
export function registerPdfBuffer(buffer: ArrayBuffer): void {
  if (buffer) {
    activeBuffers.add(buffer);
  }
}

/**
 * Nuclear Amnesia: Wipes active PDF buffers, terminates active loading tasks,
 * and clears references to prevent data retention in memory.
 */
export async function purgePdfMemory(): Promise<void> {
  isCancellationRequested = true;

  if (activeLoadingTask) {
    try {
      await activeLoadingTask.destroy();
    } catch {
      // Ignore destruction errors during purge
    }
    activeLoadingTask = null;
  }

  if (activePdfDoc) {
    try {
      activePdfDoc.cleanup();
    } catch {
      // Ignore cleanup errors during purge
    }
    try {
      if (typeof activePdfDoc.destroy === 'function') {
        await activePdfDoc.destroy();
      } else if (activePdfDoc.loadingTask?.destroy) {
        await activePdfDoc.loadingTask.destroy();
      }
    } catch {
      // Ignore destruction errors during purge
    }
    activePdfDoc = null;
  }

  // Zero-fill all tracked ArrayBuffers
  for (const buffer of activeBuffers) {
    try {
      new Uint8Array(buffer).fill(0);
    } catch {
      // Buffer may be detached or read-only
    }
  }
  activeBuffers.clear();

  isCancellationRequested = false;
}

// Register purgePdfMemory with the OCR engine's burn hook registry
registerBurnHook(purgePdfMemory);

/**
 * Reconstructs clean paragraph breaks, line breaks, and horizontal whitespace
 * from raw TextItem streams extracted via page.getTextContent().
 */
export function reconstructTextFromContent(items: any[]): string {
  if (!items || items.length === 0) return '';

  const textItems = items.filter(
    (item) => item && typeof item.str === 'string'
  ) as TextItemLike[];

  if (textItems.length === 0) return '';

  let result = '';
  let lastY: number | null = null;
  let lastX = 0;
  let lastWidth = 0;
  let lastHeight = 10;
  let lastHasEOL = false;

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    const str = item.str;

    // Skip empty items unless they carry an end-of-line marker
    if (!str && !item.hasEOL) continue;

    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const currentX = transform[4] ?? 0;
    const currentY = transform[5] ?? 0;
    const currentWidth = item.width ?? 0;
    const currentHeight = item.height || Math.abs(transform[3]) || lastHeight || 10;

    if (lastY !== null) {
      const deltaY = lastY - currentY;
      const isDifferentLine = lastHasEOL || Math.abs(deltaY) > Math.max(3, currentHeight * 0.4);

      if (isDifferentLine) {
        // Vertical displacement heuristic:
        // Greater than 1.6x font height or > 15pt indicates paragraph / section boundary
        if (deltaY > currentHeight * 1.6 || deltaY > 15) {
          result += '\n\n';
        } else {
          result += '\n';
        }
      } else {
        // Same line: check horizontal gap between items
        const previousEndsWithSpace = /\s$/.test(result);
        const currentStartsWithSpace = /^\s/.test(str);

        if (!previousEndsWithSpace && !currentStartsWithSpace) {
          const expectedNextX = lastX + lastWidth;
          const gap = currentX - expectedNextX;
          // Natural word separation gap
          if (gap > 1.5) {
            result += ' ';
          }
        }
      }
    }

    result += str;
    lastY = currentY;
    lastX = currentX;
    lastWidth = currentWidth;
    lastHeight = currentHeight;
    lastHasEOL = !!item.hasEOL;
  }

  // Normalize excessive blank lines and trailing whitespace per line
  return result
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Determines whether extracted digital text is sparse (< 50 legible characters),
 * indicating a scanned, flattened, or raster PDF page that requires deep OCR.
 */
export function shouldFallbackToOcr(
  text: string,
  minCharThreshold = MIN_DIGITAL_CHAR_THRESHOLD
): boolean {
  const legibleCharCount = text.replace(/\s+/g, '').length;
  return legibleCharCount < minCharThreshold;
}

/**
 * Renders a PDF page to an offscreen canvas at the specified DPI (200-300 DPI)
 * and exports the raster image as a PNG Blob.
 *
 * CRITICAL MEMORY SAFEGUARD: Explicitly zeroes out canvas dimensions (width=0, height=0)
 * in a finally block to immediately release backing store GPU/RAM.
 */
export async function renderPageToBlob(page: any, dpi = DEFAULT_DPI): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering requires a DOM environment with HTMLCanvasElement support.');
  }

  const scale = dpi / 72; // Standard 72 DPI base coordinate space in PDF
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error('Failed to obtain 2D canvas rendering context.');
  }

  try {
    const renderTask = page.render({
      canvasContext: context,
      viewport,
      annotationMode: 0, // 0 = AnnotationMode.DISABLE (no interactive or external annotation rendering)
    });
    await renderTask.promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to generate image Blob from canvas.'));
        },
        'image/png'
      );
    });

    return blob;
  } finally {
    // Explicitly zero-out canvas dimensions to release backing store allocation immediately
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * In-browser dual-path PDF ingestion engine.
 *
 * - Path A (Fast Path): Extracts digital text layers with paragraph/whitespace reconstruction.
 * - Path B (Deep Path): Renders sparse/scanned pages (< 50 chars) to offscreen canvas at 200-300 DPI
 *   and pipes to local WebAssembly OCR worker.
 * - Memory Safeguards: Enforces default 20-page cap, per-page cleanup, and nuclear amnesia hooks.
 */
export async function extractTextFromPdf(
  pdfSource: File | Blob | ArrayBuffer,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  setupPdfWorker();

  let rawBuffer: ArrayBuffer;
  if (pdfSource instanceof ArrayBuffer) {
    rawBuffer = pdfSource;
  } else if (typeof Blob !== 'undefined' && pdfSource instanceof Blob) {
    rawBuffer = await pdfSource.arrayBuffer();
  } else if (pdfSource && typeof (pdfSource as any).arrayBuffer === 'function') {
    rawBuffer = await (pdfSource as any).arrayBuffer();
  } else {
    throw new Error('Invalid PDF source: expected File, Blob, or ArrayBuffer.');
  }

  registerPdfBuffer(rawBuffer);

  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  const cMapUrl = new URL(`${normalizedBase}pdfjs/cmaps/`, origin).href;
  const standardFontDataUrl = new URL(`${normalizedBase}pdfjs/standard_fonts/`, origin).href;

  ensurePromiseWithResolvers();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(rawBuffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,  // Crucial: Renders glyphs via vector paths; no DOM @font-face injection
    disableRange: true,     // Pure in-memory ArrayBuffer; disable HTTP byte-range checks
    disableStream: true,    // Disable streaming fetch requests
    disableAutoFetch: true, // Disable background pre-fetching
  });

  activeLoadingTask = loadingTask;
  let doc: any = null;

  try {
    doc = await loadingTask.promise;
    activePdfDoc = doc;

    const totalPages = doc.numPages;
    const startPage = Math.max(1, options.startPage || 1);
    const maxPages = Math.max(1, options.maxPages || DEFAULT_PAGE_CAP);
    const endPage = Math.min(startPage + maxPages - 1, totalPages);
    const hasMorePages = endPage < totalPages;

    const pageResults: string[] = [];
    const pageModes: PageModeDetail[] = [];
    const totalBatchPages = endPage - startPage + 1;

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (isCancellationRequested) {
        throw new Error('PDF extraction cancelled.');
      }

      const batchIndex = pageNum - startPage;

      // Initial page probe progress
      options.onProgress?.({
        page: pageNum,
        totalPages,
        phase: 'digital',
        percent: Math.round((batchIndex / totalBatchPages) * 100),
        statusText: `Page ${pageNum} of ${totalPages}: Probing digital text layer...`,
      });

      const page = await doc.getPage(pageNum);
      let pageText = '';
      let mode: 'digital' | 'ocr' = 'digital';

      try {
        const textContent = await page.getTextContent();
        const digitalText = reconstructTextFromContent(textContent.items);

        if (!shouldFallbackToOcr(digitalText, options.minCharThreshold)) {
          // Path A: Fast Path (Digital Text Stream)
          pageText = digitalText;
          mode = 'digital';

          options.onProgress?.({
            page: pageNum,
            totalPages,
            phase: 'digital',
            percent: Math.round(((batchIndex + 1) / totalBatchPages) * 100),
            statusText: `Page ${pageNum} of ${totalPages}: Extracted digital text (${digitalText.length} chars)`,
          });
        } else {
          // Path B: Deep Path (Scanned / Raster PDF via Local OCR)
          mode = 'ocr';

          options.onProgress?.({
            page: pageNum,
            totalPages,
            phase: 'ocr',
            percent: Math.round((batchIndex / totalBatchPages) * 100),
            statusText: `Page ${pageNum} of ${totalPages}: Scanned page detected. Rasterizing for local OCR...`,
          });

          const dpi = options.dpi || DEFAULT_DPI;
          const imageBlob = await (options.customRasterizer
            ? options.customRasterizer(page, dpi)
            : renderPageToBlob(page, dpi));

          const ocrFn = options.ocrEngine || performLocalOcr;
          const ocrText = await ocrFn(imageBlob, (ocrProgress) => {
            const basePercent = (batchIndex / totalBatchPages) * 100;
            const slicePercent = 100 / totalBatchPages;
            const overallPercent = Math.min(
              99,
              Math.round(basePercent + ocrProgress.progress * slicePercent)
            );
            options.onProgress?.({
              page: pageNum,
              totalPages,
              phase: 'ocr',
              percent: overallPercent,
              statusText: `Page ${pageNum} of ${totalPages}: Local OCR (${Math.round(ocrProgress.progress * 100)}%)...`,
            });
          });

          pageText = ocrText;
        }
      } finally {
        // Immediate frame cleanup to release page DOM/canvas handles
        try {
          page.cleanup();
        } catch {
          // Ignore page cleanup errors
        }
      }

      pageResults.push(pageText);
      pageModes.push({ page: pageNum, mode, charCount: pageText.length });
    }

    // Determine overall ingestion provenance
    const hasDigital = pageModes.some((m) => m.mode === 'digital');
    const hasOcr = pageModes.some((m) => m.mode === 'ocr');
    let overallMode: IngestionMode = 'digital';
    if (hasDigital && hasOcr) {
      overallMode = 'hybrid';
    } else if (hasOcr) {
      overallMode = 'ocr';
    }

    return {
      text: pageResults.join('\n\n'),
      totalPages,
      pagesProcessed: endPage,
      hasMorePages,
      mode: overallMode,
      pageModes,
    };
  } finally {
    // Explicitly release document proxy and worker handles
    if (doc) {
      try {
        doc.cleanup();
      } catch {}
      try {
        if (typeof doc.destroy === 'function') {
          await doc.destroy();
        } else if (doc.loadingTask?.destroy) {
          await doc.loadingTask.destroy();
        }
      } catch {}
      activePdfDoc = null;
    }
    activeLoadingTask = null;
  }
}
