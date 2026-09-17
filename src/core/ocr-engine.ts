import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

let cachedWorker: any = null;

/**
 * Perform 100% local, offline OCR extraction using in-browser WebAssembly.
 * All worker scripts, core wasm binaries, and traineddata models are loaded
 * exclusively from local /ocr/ paths with zero external network connectivity.
 */
export async function performLocalOcr(
  imageSource: File | Blob | string,
  onProgress?: (progressInfo: OcrProgress) => void
): Promise<string> {
  onProgress?.({ status: 'Initializing local OCR engine...', progress: 0.05 });

  try {
    if (!cachedWorker) {
      cachedWorker = await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/tesseract-core-simd-lstm.wasm.js',
        langPath: '/ocr/lang-data',
        gzip: true,
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: 'Recognizing text from image...',
              progress: 0.1 + (m.progress || 0) * 0.85,
            });
          } else if (m.status) {
            onProgress?.({
              status: m.status,
              progress: 0.08,
            });
          }
        },
      });
    }

    onProgress?.({ status: 'Processing image...', progress: 0.1 });
    const ret = await cachedWorker.recognize(imageSource);
    onProgress?.({ status: 'Text extraction complete', progress: 1.0 });

    return ret.data.text || '';
  } catch (error) {
    // If SIMD fails in an older environment, fallback to standard core
    console.warn('Local OCR SIMD attempt failed or worker error, attempting fallback...', error);
    try {
      if (cachedWorker) {
        await cachedWorker.terminate().catch(() => {});
        cachedWorker = null;
      }
      cachedWorker = await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/tesseract-core-lstm.wasm.js',
        langPath: '/ocr/lang-data',
        gzip: true,
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: 'Recognizing text from image...',
              progress: 0.1 + (m.progress || 0) * 0.85,
            });
          }
        },
      });
      const fallbackRet = await cachedWorker.recognize(imageSource);
      return fallbackRet.data.text || '';
    } catch (fallbackError) {
      console.error('Local OCR completely failed:', fallbackError);
      throw new Error(
        'Unable to perform local OCR on image. Ensure the image is clear and in a supported format.'
      );
    }
  }
}

/**
 * Terminate and flush the worker on "Burn Local Data".
 */
export async function terminateOcrWorker(): Promise<void> {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // Ignore termination errors
    } finally {
      cachedWorker = null;
    }
  }
}
