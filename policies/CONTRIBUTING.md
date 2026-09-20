# Contributing Statutory Subscription Policies to Bill-of-Rights-Bot

Welcome! Consumer advocates, attorneys, and civic contributors can contribute state Automatic Renewal Laws (ARL), FTC Click-to-Cancel interpretations, and negative option subscription rules to Bill-of-Rights-Bot without touching any TypeScript or React code.

## How to Add or Update a Jurisdiction

1. **Locate or Create the Policy File**:
   - Files are stored in `policies/jurisdictions/<state_name>.json` (e.g. `policies/jurisdictions/california.json`).
   - Copy `policies/templates/jurisdiction-template.json` to start a new jurisdiction.

2. **Update the Fields**:
   - `jurisdictionCode`: Jurisdiction code (e.g., `"CA"`, `"NY"`, `"FTC"`).
   - `jurisdictionName`: Human-readable name (e.g., `"California"`).
   - `statuteTitle`: Name of the Act (e.g., `"California Automatic Renewal Law (ARL / AB 390 & SB 488)"`).
   - `codification`: Legal citation (e.g., `"Cal. Bus. & Prof. Code §§ 17600–17606"`).
   - `lastAudited`: Date of verification (`YYYY-MM-DD`).
   - `rules`: Array of statutory trap rules:
     - `id`: Unique identifier (e.g., `"CA-ARL-01"`).
     - `category`: Trap category (e.g., `AsymmetricCancellation`, `RetentionMaze`, `InconspicuousRenewal`, `PreRenewalNotice`, `UnilateralPriceHike`, `TrialConversion`, `UnconditionalGift`, `AffirmativeConsent`).
     - `trapName`: Descriptive title.
     - `severity`: `Unlawful`, `Watch`, or `Standard`.
     - `statutoryCitation`: Legal citation.
     - `triggerPatterns`: Regexes detecting the unlawful contract language.
     - `negativeExceptions`: Regexes that negate violation.
     - `disputeTemplate`: Notice template citing the statute.

3. **Validate Your Changes**:
   ```bash
   npm run validate:policies
   ```

4. **Submit a Pull Request**:
   Open a PR against `main`. Our CI will validate the policy against the schema.
