# BillOfRightsBot for Subscriptions ⚖️

> **100% local, statute-grounded subscription agreement auditor.**  
> Paste or upload a subscription agreement or Terms of Service (ToS) to get an instant breakdown of auto-renewal traps, asymmetric cancellation hurdles, and deceptive negative options against **ROSCA (`15 U.S.C. § 8403`)**, **FTC Act § 5 (`15 U.S.C. § 45`)**, and state auto-renewal statutes—with generated cancellation and restitution notices before you get billed.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Privacy: 100% Air-Gapped](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped-success.svg)](#privacy--air-gap-guarantee)
[![A11y: WCAG AA Compliant](https://img.shields.io/badge/A11y-WCAG%20AA%20Compliant-brightgreen.svg)](#accessibility-day-1-compliance)
[![Runtime: TypeScript + Vite](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Vite-purple.svg)](#quickstart-zero-config)
[![Roadmap: v1.1.0 In-Browser PDF](https://img.shields.io/badge/Roadmap-v1.1.0%20In--Browser%20PDF-blueviolet.svg)](ROADMAP.md)

---

## The Problem

Most consumers never read the fine print when signing up for a gym, streaming app, software subscription, or online service. By the time they attempt to cancel, they encounter:
- **Asymmetric Cancellation Hurdles:** Seamless 1-click online enrollment paired with mandatory phone calls during limited business hours, certified letters, or in-person visits to cancel.
- **Deceptive Free Trials:** Trials converting automatically into annual recurring contracts without advance reminder notices.
- **Retention Gauntlets ("Saves Mazes"):** Consumers trapped in multi-step counter-offer gauntlets, mandatory exit surveys, and "speak to an account specialist" hurdles.
- **Hidden Auto-Renewal:** Vague terms buried in tiny boilerplate text disclaiming all refunds upon automatic renewal.

Federal consumer-protection law—**ROSCA (15 U.S.C. § 8403)** and **FTC Act Section 5 (15 U.S.C. § 45(a))**—alongside state Automatic Renewal Laws (ARL) provide enforceable protections against these deceptive billing practices (note: the FTC's 2024 Click-to-Cancel amendments under 16 CFR Part 425 were vacated by the 8th Circuit in July 2025, so consumer notices rely exclusively on currently binding statutory authorities). **BillOfRightsBot levels the playing field.**

---

## Core Flow

1. **Ingest:** Paste agreement text, drop an agreement file (`.pdf`, `.txt`, `.md`, `.html`), or **drop/snap a contract photo** (`.png`, `.jpg`, `.webp`) for **100% in-browser offline OCR**.
2. **Local Normalization:** In-process text parsing and boundary sanitization with zero external cloud calls and zero telemetry.
3. **Clause Segmentation:** Heuristic boundary detection extracts discrete agreement clauses.
4. **Statute Evaluation:** Evaluates clauses against codified statutory rules (Federal ROSCA/FTC + 5 core states):
   - 🔴 **Unlawful Trap:** Direct conflict with codified statutory mandates.
   - 🟡 **Watch:** Borderline or ambiguous terms requiring consumer caution.
   - 🟢 **Compliant:** Terms compliant with statutory transparency and cancellation baselines.
5. **Actionable Remedy Generation:** Instantly drafts:
   - **Immediate Cancellation Demand** (invoking ROSCA `15 U.S.C. § 8403(3)`, FTC Act § 5 `15 U.S.C. § 45(a)`, and state online cancellation mandates).
   - **FTC & State AG Complaint Draft** (pre-formatted for `reportfraud.ftc.gov`).
   - **Unconditional Gift Restitution Notice** (invoking Cal. Bus. & Prof. Code § 17603 to demand refund of non-compliant renewal charges).
6. **Burn Local Data:** One-click button immediately purges all in-memory buffers, parsed clauses, and session state.

---

## Quickstart (Zero-Config)

```bash
# Clone the repository
git clone https://github.com/knowthankyew/bill-of-rights-bot.git
cd bill-of-rights-bot

# Launch (starts local Vite server on localhost:5173)
./start.sh
```

Or run directly via npm:

```bash
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 📺 Interactive Walkthrough (Zero Clicks)

![BillOfRightsBot Automated Walkthrough](demo.gif)

> Full high-definition recording available at [`demo.mp4`](demo.mp4).

---

## Statute Coverage (MVP Scope)

Every single rule in BillOfRightsBot is grounded in official, verified statutes:

| Jurisdiction | Code | Covered Topics & Statutory Citations | Official Source |
| :--- | :--- | :--- | :--- |
| **Federal** | `FTC` | - **15 U.S.C. § 8403 (ROSCA):** Clear upfront disclosure, express informed consent, and simple mechanism to stop recurring charges.<br>- **15 U.S.C. § 45(a) (FTC Act § 5):** Prohibits unfair/deceptive acts including asymmetric cancellation hurdles and retention gauntlets.<br>- *(Note: 2024 16 CFR Part 425 amendments were vacated July 8, 2025 in Custom Communications v. FTC and are not cited in generated notices).* | [ROSCA (15 U.S.C. Ch. 110)](https://www.ftc.gov/legal-library/browse/statutes/restore-online-shoppers-confidence-act) |
| **California** | `CA` | - **Cal. Bus. & Prof. Code § 17602(c):** Mandatory immediate online cancellation at will.<br>- **Cal. Bus. & Prof. Code § 17602(a)(4):** 15-to-45 day advance renewal notice mandate (AB 390).<br>- **Cal. Bus. & Prof. Code § 17603:** **Unconditional Gift Rule** (non-compliant services deemed unconditional gift; consumer entitled to full restitution). | [California Legislative Info](https://leginfo.legislature.ca.gov) |
| **New York** | `NY` | - **N.Y. Gen. Bus. Law § 527-a(3):** Simple online cancellation in same medium.<br>- **N.Y. Gen. Bus. Law § 527-a(2):** 15-to-30 day written advance renewal notice requirement.<br>- **N.Y. Gen. Bus. Law § 527-a(4):** Non-compliant automatic renewals are void and unenforceable. | [New York State Senate](https://www.nysenate.gov/legislation/laws/GBS/527-A) |
| **Illinois** | `IL` | - **815 ILCS 601/10(b):** Mandatory 30-to-60 day written notice prior to renewal.<br>- **815 ILCS 601/10(c):** Online cancellation option for online consumers. | [Illinois General Assembly](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=2361&ChapterID=67) |
| **Colorado** | `CO` | - **Colo. Rev. Stat. § 6-1-732(2)(b):** Mandatory direct online cancellation link/button.<br>- **Colo. Rev. Stat. § 6-1-732(2)(a):** 25-to-40 day advance renewal notice requirement. | [Colorado General Assembly](https://leg.colorado.gov/bills/hb21-1239) |
| **Delaware** | `DE` | - **Del. Code Ann. tit. 6, § 2734(a):** Clear and conspicuous auto-renewal disclosure.<br>- **Del. Code Ann. tit. 6, § 2734(b):** 30-to-60 day reminder notice window. | [Delaware Code Online](https://delcode.delaware.gov/title6/c027/sc02/index.html) |

---

## Privacy & Air-Gap Guarantee

- **Zero Cloud Ingestion:** Document parsing and rule matching execute 100% inside your local browser memory.
- **Strict Content Security Policy (CSP):** All external network calls, tracking pixels, and CDNs are blocked.
- **No Telemetry / No Tracking:** Zero analytics, cookies, or external dependencies.
- **Burn Local Data:** Clicking "Burn Local Data" flushes all in-memory text, parsed tokens, active DOM nodes, and session storage immediately.

---

## Graceful Sidecar Pairing (`event-driven-ftaas`)

BillOfRightsBot is **fully functional standalone** using deterministic regular expressions and heading heuristics. If an instance of `event-driven-ftaas` or an Ollama / local LLM endpoint is active at `http://localhost:8000` or `http://localhost:11434`, BillOfRightsBot non-blockingly probes it (250ms timeout) to refine nuanced boundary detection without errors, timeouts, or UI warnings if absent.

---

## Accessibility (Day 1 Compliance)

- **Landmarks & Semantics:** HTML5 landmarks (`header`, `main`, `aside`, `section`, `article`).
- **Live Regions:** Screen reader announcers (`aria-live="polite"`) broadcast audit completion stats and purge actions.
- **Full Keyboard Navigation:** Tab navigation across rails, filter chips, and remedy generators (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`).
- **Media Queries:** Support for `@media (prefers-reduced-motion: reduce)` and high-contrast obsidian tokens verified against WCAG AA standards.
- **Print Optimization:** `@media print` styles strip UI chrome and produce unbranded correspondence suitable for USPS Certified Mail.

---

## Testing & Verification

```bash
# Run Vitest unit rule verification suite
npm test

# Build production bundle
npm run build
```

### Automated Demo Recording (MP4 & GIF)

Regenerate the automated video demo and animated preview at any time:

```bash
./scripts/record-demo.sh
```

Or run via Node:

```bash
node scripts/record-demo.js
```

This launches a headless browser, executes the end-to-end interactive workflow (sample loading, clause analysis, scorecard filtering, statutory notice drafting, and data burning), and encodes web-standard [`demo.mp4`](demo.mp4) (H.264) and animated [`demo.gif`](demo.gif) via FFmpeg.

---

## Legal Disclaimer

> **Important:** BillOfRightsBot is an educational and consumer self-advocacy tool and does not provide formal legal advice or create an attorney-client relationship. Auto-renewal statutes and enforcement vary by state and factual circumstances. If facing an active lawsuit or collection dispute, consult a licensed consumer attorney or your local legal aid organization.

---

## License

MIT License © 2026. Built as open public-good software in the spirit of [knowthankyew](https://github.com/knowthankyew).
