<!-- diagram-meta
  last-validated: 2026-10-26
  validated-commit: 7c57262
  covers: [src/**, contracts/**]
  generated-by: manual
-->

# Architecture & Invariants Specification: Bill of Rights Bot

> Client-side consumer contract auditor, predatory subscription reality engine, and statutory dispute notice generator.

---

## 1. Executive Summary

`bill-of-rights-bot` is a client-side reality engine in the `knowthankyew` portfolio built to eliminate consumer contract asymmetries. It ingests terms of service, subscription agreements, and checkout policies (via text, PDF, or local OCR), auditing clauses against FTC Negative Option rules, ROSCA (15 U.S.C. § 8401), state Automatic Renewal Laws (ARLs), and FAA forced-arbitration precedents. It features an interactive Remedy Studio that generates formal cancellation and statutory dispute demands on local silicon.

---

## 2. System Architecture & Component Interactions

### A. Execution Sandbox & Trust Boundary

```mermaid
flowchart LR
    subgraph ClientEnvironment["Client Browser Sandbox (Air-Gapped)"]
        User["👤 Consumer / Citizen"]

        subgraph Ingestion["1. Ingestion Layer"]
            TextPaste["📝 Text Paste"]
            PDFIngest["📄 PDF Engine<br/><code>src/core/pdf-engine.ts</code>"]
            OCRIngest["📷 Local OCR Engine<br/><code>src/core/ocr-engine.ts</code>"]
            Handoff["🔗 Handoff Adapter<br/><i>(From Extension)</i>"]
            Segmenter["✂️ Segmenter & Normalizer<br/><code>src/core/segmenter.ts</code>"]
        end

        subgraph CoreEngine["2. Local Evaluation Core"]
            RuleEngine["⚡ Rule Engine<br/><code>src/core/rule-engine.ts</code>"]
            PolicyPack["📦 @knowthankyew/policy-packs/subscriptions<br/><i>(ROSCA, FTC Part 425, State ARLs)</i>"]
            RemedyEngine["⚖️ Notice Generator<br/><code>src/core/notice-generator.ts</code>"]
        end

        subgraph Presentation["3. React 19 UI & Controls"]
            Workspace["💻 Agreement Workspace"]
            Scorecard["📊 Rights Scorecard & Grid"]
            RemedyStudio["📜 Remedy & Cancellation Studio"]
            PrivacyModal["🛡️ Privacy Audit Modal"]
            BurnCtrl["🔥 Hard Burn Controller"]
        end

        subgraph TelemetryStore["4. Volatile Telemetry"]
            TelemBuffer["🧠 In-Memory Circular Buffer<br/><i>(Zero Network Egress)</i>"]
        end
    end

    %% Ingestion flow
    User -->|"Pastes or Uploads Agreement"| TextPaste & PDFIngest & OCRIngest
    Handoff -->|"Transfers Active Tab Agreement"| Segmenter
    TextPaste & PDFIngest & OCRIngest --> Segmenter

    Segmenter -->|"Segmented Clauses"| RuleEngine
    PolicyPack -.->|"Statutory Rules & Regexes"| RuleEngine

    RuleEngine -->|"Violations & Risk Score"| Workspace & Scorecard
    RuleEngine -->|"Actionable Statutory Grounds"| RemedyEngine
    RemedyEngine --> RemedyStudio

    Workspace & Scorecard -->|"Inspect Audited Terms"| User
    RemedyStudio -->|"Export Cancellation Notice"| User

    %% Telemetry & Burn
    RuleEngine -.->|"Allowlisted Spans"| TelemBuffer
    TelemBuffer -.->|"Inspect Real-Time Events"| PrivacyModal
    BurnCtrl -->|"Purges Memory & DOM State"| TelemBuffer
    BurnCtrl -->|"Wipes Document State"| Segmenter

    classDef client fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#f8fafc;
    classDef comp fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef pkg fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#f8fafc;
    classDef burn fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;

    class TextPaste,PDFIngest,OCRIngest,Handoff,Segmenter,RuleEngine,RemedyEngine,Workspace,Scorecard,RemedyStudio,PrivacyModal comp;
    class PolicyPack pkg;
    class TelemBuffer,BurnCtrl burn;
```

### B. Audit & Remedy Notice Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Consumer as Consumer / User
    participant UI as React UI (App.tsx)
    participant Core as Segmenter & RuleEngine
    participant Subs as Policy Packs (Subscriptions)
    participant Remedy as Remedy Studio
    participant Telem as Telemetry Buffer

    Consumer->>UI: Upload Terms of Service or Drop PDF
    UI->>Core: parseAndSegment(document)
    Core->>Core: Extract text, normalize punctuation & clause boundaries
    Core->>Subs: Evaluate statutory subscriptions & arbitration rules
    loop For each candidate clause
        Subs-->>Core: Check ROSCA, 16 CFR Part 425 & State ARLs
    end
    Core-->>UI: Output risk score, flagged clauses & statutory citations
    UI->>Telem: Record scan metric (clause_count, duration_ms)
    UI-->>Consumer: Render Agreement Workspace & Scorecard

    Consumer->>UI: Select "Generate Cancellation & Dispute Letter"
    UI->>Remedy: buildNotice(selectedViolations, merchantName)
    Remedy-->>UI: Formatted statutory demand invoking Click-to-Cancel rules
    UI-->>Consumer: Render editable dispute notice

    Consumer->>UI: Click "Burn Local Data"
    UI->>Telem: Purge circular buffer
    UI->>Core: Dereference all document buffers & OCR representations
    UI-->>Consumer: Return to blank amnesiac dropzone
```

---

## 3. Core Architectural Invariants

| # | Invariant | Enforcement & Guarantee |
|:--|:----------|:------------------------|
| 1 | **Zero Document Egress** | Uploaded agreements, PDFs, and OCR scans never leave local browser memory. |
| 2 | **Volatile Memory Telemetry** | Operational telemetry runs strictly in volatile RAM; no cloud or disk logging in consumer builds. |
| 3 | **Strict Key Allowlists** | Telemetry sanitizes properties against `SAFE_ALLOWLIST_KEYS`; contract text, names, and merchant account IDs are redacted. |
| 4 | **Compile-Time Dead Code Shims** | Enterprise network telemetry exporter code is excised at compile time for public consumer builds. |
| 5 | **Amnesiac State Purge (Hard Burn)** | Immediate purge resetting circular buffers, OCR scratch canvases, and DOM state. |

---

## 4. Directory Structure

```
bill-of-rights-bot/
├── docs/
│   ├── ARCHITECTURE.md          # Architecture, data flow & invariant specification
│   └── PRIVACY_TELEMETRY_SCHEMA.md # Telemetry contract specification
├── src/
│   ├── App.tsx                  # Root application view & workflow orchestration
│   ├── main.tsx                 # Entrypoint
│   ├── components/              # UI components (Workspace, Scorecard, RemedyStudio, PrivacyModal)
│   ├── contracts/               # TypeScript interfaces & handoff contracts
│   ├── core/
│   │   ├── segmenter.ts         # Document parser & clause boundary detector
│   │   ├── normalizer.ts        # Text normalization & whitespace cleanup
│   │   ├── rule-engine.ts       # Statutory evaluation engine
│   │   ├── notice-generator.ts  # Statutory cancellation notice generator
│   │   ├── pdf-engine.ts        # Local PDF text extraction
│   │   ├── ocr-engine.ts        # In-browser OCR fallback for scanned images
│   │   ├── handoff-adapter.ts   # Structured Handoff from knowthankyew-extension
│   │   └── telemetry.ts         # In-memory privacy telemetry controller
│   └── styles/                  # Styling & themes
├── tests/                       # Vitest unit & ReDoS test suites
└── vite.config.ts               # Air-gapped bundler configuration
```
