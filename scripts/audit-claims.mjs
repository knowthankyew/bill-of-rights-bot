#!/usr/bin/env node
/**
 * audit-claims.mjs - Automated Claims, Architectural Parity & Privacy Invariant Linter for BillOfRightsBot.
 *
 * Enforces:
 * 1. Zero-Egress Privacy Invariant:
 *    - Verifies index.html CSP restricts connect-src to loopback only (no remote egress).
 *    - Verifies src/ contains zero unauthorized remote network egress primitives (fetch, XMLHttpRequest, sendBeacon, axios, WebSocket).
 *    - Verifies default telemetry operates in memory_only mode with strict allowlist.
 * 2. Statutory Legal Reference Parity:
 *    - Validates that statutory protections cited in README.md exist in source code and dispute notice engines.
 * 3. Vocabulary Guardrails:
 *    - Prohibits unprovable marketing adjectives ('bulletproof', 'conclusive', 'definitive', 'infinitely scalable').
 * 4. Policy Pack Conformance:
 *    - Verifies that all 6 statutory subscription policy packs in policies/jurisdictions/ validate cleanly.
 * 5. Portfolio Master Brief Parity:
 *    - Verifies that KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md accurately reflects current BillOfRightsBot test count.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stripLineComment,
  stripBlockComments,
  FORBIDDEN_NETWORK_REGEX,
  testNetworkPrimitive,
  scanSourceForNetworkPrimitives,
  scanDocumentationForVocabulary,
  BANNED_VOCABULARY,
} from './claims-linter-core.mjs';

export {
  stripLineComment,
  stripBlockComments,
  FORBIDDEN_NETWORK_REGEX,
  testNetworkPrimitive,
  scanSourceForNetworkPrimitives,
  scanDocumentationForVocabulary,
  BANNED_VOCABULARY,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..');
const DEV_ROOT = resolve(REPO_ROOT, '..');

const PROHIBITED_WORDS = [
  /\bbullet-?proof\b/i,
  /\brock\s+solid\b/i,
  /\bconclusive\b/i,
  /\bdefinitive\b/i,
  /\binfinitely scalable\b/i,
];

const REQUIRED_STATUTES = [
  '16 CFR Part 425',
  '15 U.S.C.',
  '17602',
  '17603',
  '527-a',
  '815 ILCS 601',
  '6-1-732',
  '2734',
];

/**
 * Audit 1: Zero-Egress & Air-Gapped Privacy Invariants
 */
export function auditZeroEgress(errors = []) {
  // Check index.html CSP tag directly, ignoring comments
  const indexPath = resolve(REPO_ROOT, 'index.html');
  if (!existsSync(indexPath)) {
    errors.push('Missing index.html file');
  } else {
    const rawIndex = readFileSync(indexPath, 'utf-8');
    const indexContent = rawIndex.replace(/<!--[\s\S]*?-->/g, '');
    const metaCspMatch =
      indexContent.match(/<meta\s+[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*content\s*=\s*(["'])([\s\S]*?)\1[^>]*>/i) ||
      indexContent.match(/<meta\s+[^>]*content\s*=\s*(["'])([\s\S]*?)\1[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i);

    if (!metaCspMatch) {
      errors.push('index.html CSP violation: Missing active <meta http-equiv="Content-Security-Policy"> tag');
    } else {
      const cspDirectives = metaCspMatch[2].split(';').map((d) => d.trim()).filter(Boolean);
      const connectDirective = cspDirectives.find((d) => /^connect-src\b/i.test(d));
      if (!connectDirective) {
        errors.push('index.html CSP violation: Missing connect-src directive in Content-Security-Policy');
      } else {
        const tokens = connectDirective.replace(/^connect-src\s+/i, '').split(/\s+/).filter(Boolean);
        const PERMITTED_CONNECT_ORIGINS = new Set([
          "'self'",
          'http://localhost:8000',
          'http://127.0.0.1:8000',
          'http://localhost:11434',
          'http://127.0.0.1:11434',
        ]);
        for (const token of tokens) {
          if (!PERMITTED_CONNECT_ORIGINS.has(token)) {
            errors.push(`index.html CSP violation: Unauthorized remote connect-src token detected: ${token}`);
          }
        }
      }
    }
    // Prohibit remote script, link stylesheet, or image tags in index.html
    const remoteTagMatch = indexContent.match(/<(?:script|link|img)\s+[^>]*(?:src|href)\s*=\s*["']https?:\/\//i);
    if (remoteTagMatch) {
      errors.push(`index.html security violation: Remote asset tag detected in index.html: ${remoteTagMatch[0]}`);
    }
  }

  // Scan src/ for unauthorized network primitives
  const srcDir = resolve(REPO_ROOT, 'src');
  function scanFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanFiles(fullPath);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const relPath = relative(REPO_ROOT, fullPath).split(sep).join('/');
        const rawContent = readFileSync(fullPath, 'utf-8');
        const fileErrors = scanSourceForNetworkPrimitives(rawContent, relPath, {
          isPermittedLine: (_line, _idx, path) => path === 'src/core/sidecar-client.ts',
        });
        errors.push(...fileErrors);
      }
    }
  }

  if (existsSync(srcDir)) {
    scanFiles(srcDir);
  }

  // Check telemetry allowlist does not contain PII or agreement text, and verifies memory-only default
  const telemetryPath = resolve(REPO_ROOT, 'src/core/telemetry.ts');
  if (existsSync(telemetryPath)) {
    const telContent = readFileSync(telemetryPath, 'utf-8');
    const prohibitedTelemetryKeys = ['agreement_text', 'contract_text', 'subscriber_name', 'email', 'vendor_name', 'card_number'];

    // Parse BOT_ALLOWLIST_KEYS definition
    const allowlistMatch = telContent.match(/BOT_ALLOWLIST_KEYS[^{]*=\s*new\s+Set\(\[\s*([\s\S]*?)\s*\]\)/);
    if (!allowlistMatch) {
      errors.push('Privacy violation in telemetry.ts: BOT_ALLOWLIST_KEYS set definition not found');
    } else {
      const parsedKeys = allowlistMatch[1]
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, '').trim())
        .filter(Boolean)
        .map((item) => item.replace(/['",]/g, '').trim())
        .filter(Boolean);

      if (parsedKeys.length === 0) {
        errors.push('Privacy violation in telemetry.ts: BOT_ALLOWLIST_KEYS is empty');
      }

      for (const key of prohibitedTelemetryKeys) {
        if (parsedKeys.includes(key)) {
          errors.push(`Privacy violation in telemetry.ts: Prohibited PII attribute key detected in allowlist: '${key}'`);
        }
      }
    }

    // Verify default configuration and MemoryExporter usage
    if (!/new\s+MemoryExporter\s*\(/.test(telContent)) {
      errors.push('Privacy violation in telemetry.ts: MemoryExporter must be instantiated as the default exporter');
    }
    if (!telContent.includes("mode: 'memory_only'")) {
      errors.push("Privacy violation in telemetry.ts: Default mode must be explicitly 'memory_only'");
    }
    if (!telContent.includes("serviceName: 'bill-of-rights-bot'")) {
      errors.push("Privacy violation in telemetry.ts: Default serviceName must be 'bill-of-rights-bot'");
    }
  }
}

/**
 * Audit 2: Statutory Reference Parity
 */
export function auditStatutoryParity(errors = []) {
  const readmePath = resolve(REPO_ROOT, 'README.md');
  const noticeGenPath = resolve(REPO_ROOT, 'src/core/notice-generator.ts');

  if (!existsSync(readmePath)) {
    errors.push('Missing README.md');
    return;
  }
  if (!existsSync(noticeGenPath)) {
    errors.push('Missing src/core/notice-generator.ts');
    return;
  }

  const readmeContent = readFileSync(readmePath, 'utf-8');
  const noticeContent = readFileSync(noticeGenPath, 'utf-8');

  const policiesDir = resolve(REPO_ROOT, 'policies/jurisdictions');
  let combinedPolicyContent = '';
  if (!existsSync(policiesDir)) {
    errors.push(`Missing policies/jurisdictions directory at: ${policiesDir}`);
  } else {
    combinedPolicyContent = readdirSync(policiesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readFileSync(resolve(policiesDir, f), 'utf-8'))
      .join('\n');
  }

  for (const statute of REQUIRED_STATUTES) {
    if (!readmeContent.includes(statute)) {
      errors.push(`README.md lacks declared statutory reference: '${statute}'`);
    }
    const inNotice = noticeContent.includes(statute);
    const inPolicies = combinedPolicyContent.includes(statute);

    if (!inNotice && !inPolicies) {
      errors.push(`Missing statutory enforcement in notice generator or policy packs for: '${statute}'`);
    }
  }
}

/**
 * Audit 3: Vocabulary Guardrails
 */
export function auditVocabulary(errors = []) {
  const docsToCheck = [
    resolve(REPO_ROOT, 'README.md'),
    resolve(REPO_ROOT, 'ROADMAP.md'),
    resolve(REPO_ROOT, 'ARCHITECTURE.md'),
  ];
  const docsDir = resolve(REPO_ROOT, 'docs');
  if (existsSync(docsDir)) {
    for (const entry of readdirSync(docsDir)) {
      if (entry.endsWith('.md')) {
        docsToCheck.push(resolve(docsDir, entry));
      }
    }
  }

  for (const docPath of docsToCheck) {
    if (!existsSync(docPath)) continue;
    const lines = readFileSync(docPath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      if (lower.includes('prohibits unprovable') || lower.includes('prohibited word') || lower.includes('prohibited marketing')) {
        return;
      }
      for (const pattern of PROHIBITED_WORDS) {
        if (pattern.test(line)) {
          errors.push(`Prohibited marketing word '${pattern.source}' found in ${docPath.replace(REPO_ROOT + '/', '')}:${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
}

/**
 * Audit 4: Statutory Policy Pack Conformance
 */
export function auditPolicyPacks(errors = []) {
  const jurisdictionsDir = resolve(REPO_ROOT, 'policies/jurisdictions');
  if (!existsSync(jurisdictionsDir)) {
    errors.push('Missing policies/jurisdictions directory');
    return;
  }

  const files = readdirSync(jurisdictionsDir).filter((f) => f.endsWith('.json'));
  if (files.length < 6) {
    errors.push(`Expected 6 statutory subscription policy packs, found ${files.length}`);
  }

  for (const file of files) {
    const fullPath = resolve(jurisdictionsDir, file);
    try {
      const parsed = JSON.parse(readFileSync(fullPath, 'utf-8'));
      if (!parsed.jurisdictionCode || !parsed.jurisdictionName) {
        errors.push(`Policy pack ${file} missing jurisdictionCode or jurisdictionName`);
      }
      if (!parsed.statuteTitle || !parsed.codification) {
        errors.push(`Policy pack ${file} missing statuteTitle or codification`);
      }
      if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
        errors.push(`Policy pack ${file} missing non-empty rules array`);
      }
    } catch (err) {
      errors.push(`Failed to parse policy pack ${file}: ${err.message}`);
    }
  }
}

/**
 * Audit 5: Portfolio Master Brief Parity
 */
export function auditPortfolioMasterBrief(
  errors = [],
  { requireBrief = false, overrideBriefPath = null } = {}
) {
  const briefCandidates = overrideBriefPath
    ? [overrideBriefPath]
    : [
        resolve(DEV_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
        resolve(REPO_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
      ];
  const briefPath = briefCandidates.find((p) => existsSync(p));

  if (!briefPath) {
    if (requireBrief) {
      errors.push('KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md not found but required via --require-brief.');
    }
    return false;
  }

  const briefContent = readFileSync(briefPath, 'utf-8');
  const match = briefContent.match(/`bill-of-rights-bot`.*?(\d+)\/(\d+)\s+Unit Tests/);
  if (!match) {
    errors.push('Could not find bill-of-rights-bot test inventory count in KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
    return false;
  }

  const documentedCount = parseInt(match[1], 10);
  const testsDir = resolve(REPO_ROOT, 'tests/unit');
  let actualCount = 0;
  if (existsSync(testsDir)) {
    const testFiles = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.test.js'));
    for (const file of testFiles) {
      const code = readFileSync(resolve(testsDir, file), 'utf-8');
      const itMatches = code.match(/\bit(?:\.only|\.skip)?\s*\(/g) || [];
      actualCount += itMatches.length;
    }
  }

  if (documentedCount !== actualCount) {
    errors.push(
      `Portfolio Brief Drift: KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md documents ${match[1]}/${match[2]} tests, but actual test suite has ${actualCount} tests.`
    );
    return false;
  }

  return true;
}

/**
 * Main execution CLI
 */
export function runAllAudits(options = {}) {
  const errors = [];
  auditZeroEgress(errors);
  auditStatutoryParity(errors);
  auditVocabulary(errors);
  auditPolicyPacks(errors);
  const briefChecked = auditPortfolioMasterBrief(errors, options);

  return { errors, briefChecked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('=== BillOfRightsBot Claims, Architecture & Privacy Invariant Audit ===\n');
  const requireBrief = process.argv.includes('--require-brief');
  const { errors, briefChecked } = runAllAudits({ requireBrief });

  if (errors.length > 0) {
    console.error(`[FAIL] Found ${errors.length} claims / architectural invariant violation(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('[PASS] All BillOfRightsBot architectural & claims invariants verified:');
  console.log("  ✓ Zero remote egress verified (loopback sidecar only, zero remote primitives in src/)");
  console.log('  ✓ Statutory citations verified across FTC and state jurisdictions');
  console.log('  ✓ Zero prohibited marketing adjectives detected');
  console.log('  ✓ Declarative subscription policy packs validated (6 jurisdictions)');
  if (briefChecked) {
    console.log('  ✓ Portfolio Master Brief parity verified');
  } else {
    console.log('  - Portfolio Master Brief check skipped (isolated CI)');
  }
  process.exit(0);
}
