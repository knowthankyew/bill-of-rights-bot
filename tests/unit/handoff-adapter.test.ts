import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapHandoffToAuditReport } from '../../src/core/handoff-adapter';
import { generateStatutoryNotice } from '../../src/core/notice-generator';
import {
  KtyHandoffPayload,
  KTY_HANDOFF_SESSION_KEY,
  validateHandoffPayload,
} from '@knowthankyew/privacy-telemetry';
import { useKTYHandoff } from '@knowthankyew/privacy-telemetry/react';

const reactHarness = vi.hoisted(() => {
  const states: unknown[] = [];
  let stateIndex = 0;
  let pendingEffects: Array<() => void | (() => void)> = [];
  let cleanups: Array<() => void> = [];

  return {
    reset() {
      for (const cleanup of cleanups) cleanup();
      states.length = 0;
      stateIndex = 0;
      pendingEffects = [];
      cleanups = [];
    },
    renderHook<T>(hookFn: () => T): T {
      stateIndex = 0;
      pendingEffects = [];
      let result = hookFn();
      if (pendingEffects.length > 0) {
        const effects = pendingEffects;
        pendingEffects = [];
        for (const eff of effects) {
          const cleanup = eff();
          if (typeof cleanup === 'function') cleanups.push(cleanup);
        }
        stateIndex = 0;
        result = hookFn();
      }
      return result;
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
      const idx = stateIndex++;
      if (!(idx in states)) {
        states[idx] = typeof initial === 'function' ? (initial as () => T)() : initial;
      }
      const setState = (next: T | ((prev: T) => T)) => {
        const prev = states[idx] as T;
        states[idx] = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      };
      return [states[idx] as T, setState];
    },
    useEffect(fn: () => void | (() => void)) {
      pendingEffects.push(fn);
    },
    useCallback<T extends (...args: never[]) => unknown>(fn: T): T {
      return fn;
    },
  };
});

vi.mock('react', () => ({
  useState: reactHarness.useState,
  useEffect: reactHarness.useEffect,
  useCallback: reactHarness.useCallback,
}));

function stubHandoffGlobals(initialPayload?: KtyHandoffPayload) {
  const store = new Map<string, string>();
  if (initialPayload) {
    store.set(KTY_HANDOFF_SESSION_KEY, JSON.stringify(initialPayload));
  }
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  vi.stubGlobal('window', {
    location: { search: '?kty_handoff=1', pathname: '/' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    history: { replaceState: vi.fn() },
  });
}

describe('Milestone 7 Phase 3: Destination Handoff Intake Bypass (tests/unit/handoff-adapter.test.ts)', () => {
  beforeEach(() => {
    reactHarness.reset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    reactHarness.reset();
    vi.unstubAllGlobals();
  });

  const samplePayload: KtyHandoffPayload = {
    version: '1.0',
    originApp: 'knowthankyew-extension',
    domain: 'predatory-gym.com',
    scanTimestamp: '2026-10-04T18:00:00.000Z',
    riskScore: 85,
    summary: { critical: 1, warning: 1, info: 0 },
    primaryLegalLink: {
      url: 'https://predatory-gym.com/terms',
      title: 'Membership Terms',
      category: 'TERMS',
      source: 'DOM_ANCHOR',
    },
    targetTool: 'bill-of-rights-bot',
    findings: [
      {
        ruleId: 'AR-001',
        title: 'Negative Option Continuous Billing',
        category: 'AUTO_RENEWAL',
        severity: 'CRITICAL',
        statuteCode: '15 U.S.C. § 8403',
        statuteTitle: 'ROSCA Simple Cancellation & Disclosure',
        matchedSnippet: 'Membership renews automatically at $59.99/mo until in-person cancellation.',
        explanation: 'Requires physical certified mail or in-person visits to cancel online signup.',
        recommendation: 'Demand symmetrical cancellation mechanism under ROSCA and FTC Act § 5.',
      },
      {
        ruleId: 'ARB-001',
        title: 'Forced Arbitration Waiver',
        category: 'ARBITRATION',
        severity: 'WARNING',
        statuteCode: '9 U.S.C. § 2',
        statuteTitle: 'FAA Waiver',
        matchedSnippet: 'You waive all rights to a jury trial or class action dispute.',
        explanation: 'Forces consumer claims into private corporate dispute tribunals.',
        recommendation: 'Send 30-day arbitration opt-out letter.',
      },
    ],
  };

  it('maps KtyHandoffPayload to an actionable AuditReport with zero data loss', () => {
    expect(validateHandoffPayload(samplePayload)).toBe(true);
    const report = mapHandoffToAuditReport(samplePayload, 'FTC');

    expect(report.jurisdiction).toBe('FTC');
    expect(report.agreementTitle).toContain('predatory-gym.com');
    expect(report.summary.totalClauses).toBe(2);
    expect(report.summary.unlawfulCount).toBe(1);
    expect(report.summary.watchCount).toBe(1);
    expect(report.summary.riskLevel).toBe('Critical');
    expect(report.summary.scorePercentage).toBe(15);
    expect(report.summary.unconditionalGiftTriggered).toBe(true);

    const unlawfulClause = report.clauses[0];
    expect(unlawfulClause.heading).toBe('Negative Option Continuous Billing');
    expect(unlawfulClause.severity).toBe('Unlawful');
    expect(unlawfulClause.statutoryCitation).toBe('15 U.S.C. § 8403');
    expect(unlawfulClause.statuteSummary).toBe('ROSCA Simple Cancellation & Disclosure');
    expect(unlawfulClause.remedy).toContain('symmetrical cancellation');

    const watchClause = report.clauses[1];
    expect(watchClause.severity).toBe('Watch');
  });

  it('feeds handoff report directly into RemedyStudio dispute notice generator', () => {
    const report = mapHandoffToAuditReport(samplePayload, 'CA');

    const citedClauses = report.clauses
      .filter((c) => c.severity === 'Unlawful')
      .map((c) => `${c.heading}: ${c.statutoryCitation} - ${c.trapName}`);

    expect(citedClauses.length).toBe(1);

    const notice = generateStatutoryNotice('ClickToCancelDemand', {
      subscriberName: 'Jane Consumer',
      vendorName: 'Predatory Gym LLC',
      accountIdentifier: 'jane@example.com',
      jurisdiction: 'CA',
      cancellationDate: '2026-10-04',
      disputedAmount: '59.99',
      unlawfulClausesCited: citedClauses,
    });

    expect(notice.content).toContain('Predatory Gym LLC');
    expect(notice.content).toContain('15 U.S.C. § 8403');
    expect(notice.content).toContain('Negative Option Continuous Billing');
    expect(notice.content).not.toMatch(/16\s*CFR\s*(?:Part|§)?\s*425/i);

    const clawback = generateStatutoryNotice('UnconditionalGiftClawback', {
      subscriberName: 'Jane Consumer',
      vendorName: 'Predatory Gym LLC',
      accountIdentifier: 'jane@example.com',
      jurisdiction: 'CA',
      cancellationDate: '2026-10-04',
      disputedAmount: '59.99',
      unlawfulClausesCited: citedClauses,
    });
    expect(clawback.content).toContain('$59.99');
    expect(clawback.content).toContain('UNCONDITIONAL GIFT');
  });

  it('accepts matching targetTool via useKTYHandoff("bill-of-rights-bot") and leaves mismatched targetTool returning null', () => {
    expect(validateHandoffPayload(samplePayload)).toBe(true);
    stubHandoffGlobals(samplePayload);

    const matched = reactHarness.renderHook(() => useKTYHandoff('bill-of-rights-bot'));
    expect(matched.isHandoffActive).toBe(true);
    expect(matched.payload?.domain).toBe('predatory-gym.com');

    reactHarness.reset();
    const otherToolPayload: KtyHandoffPayload = {
      ...samplePayload,
      targetTool: 'warranty-watch',
    };
    expect(validateHandoffPayload(otherToolPayload)).toBe(true);
    stubHandoffGlobals(otherToolPayload);

    const mismatched = reactHarness.renderHook(() => useKTYHandoff('bill-of-rights-bot'));
    expect(mismatched.payload).toBeNull();
    expect(mismatched.isHandoffActive).toBe(false);
  });
});
