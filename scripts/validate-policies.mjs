#!/usr/bin/env node
// ==============================================================================
// validate-policies.mjs - Automated Schema & Invariant Validator for Subscription Policies
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const POLICIES_DIR = path.join(ROOT_DIR, 'policies', 'jurisdictions');
const SCHEMA_FILE = path.join(ROOT_DIR, 'policies', 'schemas', 'subscription-policy.schema.json');

console.log('\n=== Validating Statutory Subscription Policy Packs ===\n');

if (!fs.existsSync(SCHEMA_FILE)) {
  console.error(`❌ Schema file not found: ${SCHEMA_FILE}`);
  process.exit(1);
}

const ALLOWED_CATEGORIES = new Set([
  'AsymmetricCancellation',
  'RetentionMaze',
  'InconspicuousRenewal',
  'PreRenewalNotice',
  'UnilateralPriceHike',
  'TrialConversion',
  'UnconditionalGift',
  'AffirmativeConsent'
]);

const ALLOWED_SEVERITIES = new Set([
  'Unlawful',
  'Watch',
  'Standard'
]);

const files = fs.readdirSync(POLICIES_DIR).filter(f => f.endsWith('.json'));

let errors = 0;
let validated = 0;

for (const file of files) {
  const filePath = path.join(POLICIES_DIR, file);
  process.stdout.write(`  Checking ${file.padEnd(20)} ... `);
  
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const policy = JSON.parse(raw);

    if (!policy.jurisdictionCode || !policy.jurisdictionName) {
      throw new Error('Missing jurisdictionCode or jurisdictionName');
    }
    if (!policy.statuteTitle || !policy.codification) {
      throw new Error('Missing statuteTitle or codification');
    }
    if (!policy.lastAudited) {
      throw new Error('Missing lastAudited');
    }
    if (policy.officialSourceUrl && !policy.officialSourceUrl.startsWith('http')) {
      throw new Error('officialSourceUrl must be a valid http/https URL');
    }
    if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
      throw new Error('rules must be a non-empty array of StatuteRule');
    }

    for (const rule of policy.rules) {
      if (!rule.id || !rule.trapName || !rule.statutoryCitation || !rule.statuteSummary) {
        throw new Error(`Rule missing required fields (id, trapName, statutoryCitation, statuteSummary): ${rule.id || 'unknown'}`);
      }
      if (!ALLOWED_CATEGORIES.has(rule.category)) {
        throw new Error(`Invalid category "${rule.category}" in rule ${rule.id}`);
      }
      if (!ALLOWED_SEVERITIES.has(rule.severity)) {
        throw new Error(`Invalid severity "${rule.severity}" in rule ${rule.id}`);
      }
      if (!Array.isArray(rule.triggerPatterns) || rule.triggerPatterns.length === 0) {
        throw new Error(`Rule ${rule.id} must have non-empty triggerPatterns`);
      }
      for (const pattern of rule.triggerPatterns) {
        new RegExp(pattern, 'i');
      }
      if (rule.negativeExceptions) {
        for (const contra of rule.negativeExceptions) {
          new RegExp(contra, 'i');
        }
      }
      if (!rule.disputeTemplate || typeof rule.disputeTemplate !== 'string') {
        throw new Error(`Rule ${rule.id} missing disputeTemplate string`);
      }
    }

    console.log('\x1b[32mPASS\x1b[0m');
    validated++;
  } catch (err) {
    console.log(`\x1b[31mFAIL: ${err.message}\x1b[0m`);
    errors++;
  }
}

console.log(`\nResults: ${validated} policy packs validated, ${errors} error(s).\n`);
if (errors > 0) {
  process.exit(1);
}
