/**
 * BillOfRightsBot Telemetry Adapter
 * Powered by @knowthankyew/privacy-telemetry
 * 
 * Invariants:
 * 1. Default mode is 'memory_only' with MemoryExporter. Zero network egress.
 * 2. Raw document/subscription bodies, user contracts, or PII payloads are strictly forbidden from attributes.
 * 3. "Burn Local Data" purges all buffered spans and audit events, resetting telemetry.
 * 4. Honest privacy audit affordance: never reports "local-only" if an OTLP exporter is active.
 */

import {
  TelemetryManager as BaseTelemetryManager,
  MemoryExporter,
  TelemetryMode,
  EgressPolicy,
  TelemetryConfig,
  SpanRecord,
  SessionAuditEvent,
  PrivacyAuditReport,
  PrivacyClaims,
  DEFAULT_SAFE_ALLOWLIST_KEYS,
} from '@knowthankyew/privacy-telemetry';

export type {
  TelemetryMode,
  EgressPolicy,
  TelemetryConfig,
  SpanRecord,
  SessionAuditEvent,
  PrivacyAuditReport,
  PrivacyClaims,
};

export { MemoryExporter };

// Domain-specific operational attributes for BillOfRightsBot
export const BOT_ALLOWLIST_KEYS: ReadonlySet<string> = new Set([
  'unlawful_count',
  'score_percentage',
  'sidecar_active',
  'unconditional_gift_triggered',
  'agreement_title',
  'ocr_used',
]);

export const SAFE_ALLOWLIST_KEYS: ReadonlySet<string> = new Set([
  ...DEFAULT_SAFE_ALLOWLIST_KEYS,
  ...BOT_ALLOWLIST_KEYS,
]);

export function getPrivacyClaims(report: PrivacyAuditReport): PrivacyClaims {
  if (report.isLocalOnlyHonest) {
    return {
      isLocalOnlyHonest: true,
      isEnterpriseBuild: false,
      appTitleSuffix: '',
      badgeLabel: 'Zero Network • Memory-Only',
      dropzoneNotice: '100% Client-Side Local Execution • Zero Network Transmission',
      disclaimerExecutionText:
        'All subscription audits execute 100% locally in your browser with zero remote network transmission.',
      footerTitle: '100% Local Air-Gapped Subscription Agreement Reality Engine.',
      footerSubtext:
        'Zero Telemetry • Zero Remote Agreement Egress • FTC Click-to-Cancel & State ARL Reality Engine',
      modalStatusTitle: '100% Local-First & Private (Memory-Only Telemetry)',
      modalStatusDescription:
        'All computation and telemetry spans remain buffered strictly in volatile memory. No outbound network calls are made. Telemetry purges immediately upon invoking "Burn Local Data".',
      otlpEndpoint: null,
    };
  }

  return {
    isLocalOnlyHonest: false,
    isEnterpriseBuild: true,
    appTitleSuffix: ' (Enterprise Build)',
    badgeLabel: `OTLP Active (${report.telemetryMode})`,
    dropzoneNotice: 'Local Agreement Parsing • OTLP Operational Metadata Active (Strictly Redacted)',
    disclaimerExecutionText: `Subscription evaluations execute in-browser. Scrubbed operational telemetry is exported to configured OTLP endpoint (${report.otlpEndpoint}). Agreement text and terms are never transmitted.`,
    footerTitle:
      'Enterprise Subscription Agreement Reality Engine (OTLP Telemetry Active).',
    footerSubtext:
      'Enterprise Telemetry Mode • Operational Metadata Export Active • Agreements Air-Gapped',
    modalStatusTitle: 'Enterprise OTLP Telemetry Active',
    modalStatusDescription: `Telemetry spans are exported to configured OTLP endpoint: ${report.otlpEndpoint}. Agreement text and sensitive clauses are redacted via strict allowlist.`,
    otlpEndpoint: report.otlpEndpoint,
  };
}

export class TelemetryManager extends BaseTelemetryManager {
  constructor(customConfig?: Partial<TelemetryConfig>) {
    super(
      { serviceName: 'bill-of-rights-bot', ...customConfig },
      BOT_ALLOWLIST_KEYS
    );
  }

  public override getPrivacyClaims(): PrivacyClaims {
    return getPrivacyClaims(this.getPrivacyAuditReport());
  }
}

export const telemetry = new TelemetryManager();
