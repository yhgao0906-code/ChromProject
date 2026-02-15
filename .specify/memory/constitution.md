<!--
Sync Impact Report
==================
- Version change: N/A → 1.0.0 (initial ratification)
- Modified principles: None (initial creation)
- Added sections:
  - Core Principles (5 principles)
  - Technology & Architecture Constraints
  - Development Workflow
  - Governance
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check
    section already uses generic gate references)
  - .specify/templates/spec-template.md ✅ compatible (no constitution-
    specific references requiring change)
  - .specify/templates/tasks-template.md ✅ compatible (phase structure
    aligns with principles)
- Follow-up TODOs: None
-->

# 宇航工具箱 (Yuhang Toolbox) Constitution

## Core Principles

### I. Manifest V3 Compliance

All extension code MUST conform to Chrome Manifest V3 specifications.
Service workers MUST be used instead of persistent background pages.
Content Security Policy MUST restrict script sources to `'self'` and
`'wasm-unsafe-eval'`; inline scripts are forbidden. Every Chrome API
usage MUST declare the minimum required permission in `manifest.json`.

**Rationale**: Manifest V3 is the only supported extension platform
going forward. Non-compliance results in rejection from the Chrome
Web Store and eventual removal from user browsers.

### II. API Key Security

API keys and credentials MUST be stored exclusively in
`chrome.storage.local` and MUST NOT appear in source code, commit
history, or logs. All LLM API calls MUST be routed through the
`DeepSeekAPI` class in `api-service.js` to centralize credential
handling. New API integrations MUST NOT introduce alternative
credential storage mechanisms.

**Rationale**: Leaked API keys cause unauthorized usage and financial
liability. Centralized management reduces the surface area for
accidental exposure.

### III. User Privacy

The extension MUST NOT collect, transmit, or store personally
identifiable information beyond what is strictly required for the
active feature operation. Text content sent to LLM APIs MUST be
used only for the immediate request and MUST NOT be persisted
server-side by the extension. Features that can operate locally
(e.g., Markdown-to-Word conversion) MUST do so without network
calls.

**Rationale**: Users trust browser extensions with broad page access.
Violating that trust damages reputation and may violate data
protection regulations.

### IV. Separation of Concerns

Each core file MUST have a single, well-defined responsibility:
- `background.js`: Service worker lifecycle, context menus, proxy
  rules, cross-component message routing, persistent state.
- `sidepanel.js` / `sidepanel.html`: UI rendering and user
  interaction logic.
- `content.js`: DOM interaction on the active web page (text
  selection, form filling).
- `api-service.js`: LLM provider abstraction, streaming response
  handling, model configuration.
- `styles.css`: All visual styling.

New features MUST be placed in the file whose responsibility aligns
with the feature's concern. If no existing file is appropriate, a
new module MUST be justified and documented in the PR description.

**Rationale**: Clear boundaries prevent the codebase from devolving
into a monolithic script that is difficult to debug and extend.

### V. Simplicity & YAGNI

Features MUST solve a concrete, stated user need. Speculative
abstractions, premature configurability, and framework introductions
MUST be rejected unless justified by an immediate requirement.
Third-party libraries added to `lib/` MUST be minified and MUST NOT
duplicate functionality already available in the project or the
browser platform.

**Rationale**: A browser extension must remain lightweight. Every
additional dependency increases load time, attack surface, and
maintenance burden.

## Technology & Architecture Constraints

- **Runtime**: Chrome Extension (Manifest V3), executed in the
  browser environment (service worker + content script + side panel).
- **Languages**: Vanilla JavaScript (ES modules where supported by
  Manifest V3). Vue.js components are permitted in `vue/` for
  complex interactive features loaded dynamically.
- **Styling**: Single `styles.css` file with space-themed design
  language. CSS-only solutions are preferred over JS-driven styling.
- **LLM Providers**: DeepSeek V3 and 讯飞星火 via the unified
  `DeepSeekAPI` class. Adding a new provider MUST extend the existing
  class rather than creating a parallel integration.
- **Packaging**: `pack.sh` produces versioned zip archives. Version
  MUST be sourced from `manifest.json` as the single source of truth.
- **No Build Step**: The extension runs directly from source files.
  No transpilation, bundling, or build tooling is required or
  permitted unless a future need is explicitly justified.

## Development Workflow

1. **Load & Test Locally**: Load unpacked via `chrome://extensions/`
   with Developer Mode enabled. Verify changes by reloading the
   extension (for `background.js` / `manifest.json`) or reopening
   the side panel (for UI / content script changes).
2. **Manual Verification**: Before every commit, the developer MUST
   verify the modified feature works end-to-end in the browser.
   Automated tests are optional but encouraged for utility functions.
3. **Commit Discipline**: Each commit MUST address a single logical
   change. Commit messages MUST be descriptive of the change's
   purpose (not just "fix bug" or "update").
4. **Version Bumps**: When a user-facing feature is added or a
   significant bug is fixed, `manifest.json` version MUST be
   incremented following semver conventions before packaging.
5. **Code Review**: All changes to `background.js`, `api-service.js`,
   and `manifest.json` (security-sensitive files) SHOULD be reviewed
   before merging when collaborating with others.

## Governance

This constitution is the authoritative reference for project
principles and practices. In case of conflict between this document
and any other project documentation, this constitution takes
precedence.

**Amendment Procedure**:
1. Propose changes via a pull request modifying this file.
2. Document the rationale for each principle addition, removal, or
   modification in the PR description.
3. Update `CONSTITUTION_VERSION` following semver rules:
   - MAJOR: Principle removal or incompatible redefinition.
   - MINOR: New principle or materially expanded guidance.
   - PATCH: Clarifications, wording, or non-semantic refinements.
4. Update `LAST_AMENDED_DATE` to the date the amendment is merged.

**Compliance Review**: When planning or reviewing a feature, verify
alignment with all five core principles. Any deviation MUST be
documented and justified in the plan's Complexity Tracking section.

**Guidance File**: Refer to `CLAUDE.md` for runtime development
guidance including architecture details and testing procedures.

**Version**: 1.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
