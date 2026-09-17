import { describe, it, expect } from 'vitest';
import { performLocalOcr, terminateOcrWorker } from '../../src/core/ocr-engine';

describe('ocr-engine', () => {
  it('terminates cleanly without errors even when no worker is active', async () => {
    await expect(terminateOcrWorker()).resolves.toBeUndefined();
  });

  it('exports performLocalOcr function', () => {
    expect(typeof performLocalOcr).toBe('function');
  });
});
