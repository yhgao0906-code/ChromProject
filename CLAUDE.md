# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

宇航工具箱 (Yuhang Toolbox) is a Chrome browser extension (Manifest V3) providing AI-powered utilities: JSON conversion, translation, text summarization, Markdown-to-Word conversion, Excel workload analysis, test data generation, and URL proxy/interception. AI features use DeepSeek V3 and 讯飞星火 LLM APIs via a unified client.

## Build & Package

```bash
./pack.sh    # Creates yuhang-toolbox-v{version}.zip from manifest.json version
```

No build step, transpilation, or bundling exists. The extension runs directly from source files. All dependencies are vendored in `lib/`.

## Development

Load unpacked at `chrome://extensions/` with Developer Mode enabled. After changes:
- `background.js` or `manifest.json` → reload the extension
- `sidepanel.js`, `content.js`, `styles.css`, or UI files → close and reopen the side panel

No test framework, linter, or package.json exists. Manual browser verification is the testing method.

## Architecture

### Message Passing (3-way communication)

```
sidepanel.js  ←──chrome.runtime.sendMessage──→  background.js  ←──chrome.tabs.sendMessage──→  content.js
     │                                               │
     │  (direct API calls)                           │  (chrome.storage, chrome.alarms,
     ↓                                               │   declarativeNetRequest, proxy)
api-service.js                                       │
```

- **background.js** — Service worker acting as central message broker. Manages context menus, proxy/interception rules, persistent state (`chrome.storage.local`), and a keepAlive heartbeat via `chrome.alarms` (1-minute interval) to prevent service worker termination. Auto-cleans operation history older than 24 hours.
- **sidepanel.js** — Main UI controller (vanilla JS DOM manipulation, no framework). Sends messages to background via `chrome.runtime.sendMessage`, makes direct LLM API calls through `DeepSeekAPI`, manages local UI state synced with background's persistent state on load via `requestPersistentState` message.
- **content.js** — Injected into all pages. Handles text selection (mouseup/contextmenu events), form auto-filling with Vue component detection (`element.__vue__` check, emits `input`/`change` events for v-model binding), and DevOps page scraping for version collection.
- **api-service.js** — `DeepSeekAPI` class: multi-model configuration (per-model apiKey, baseUrl, extraParams), streaming responses with `AbortController` for cancellation, smart Java object detection (regex-based local conversion bypasses API), model-specific prompt formatting. Also contains `ExcelAnalyzer` class for workload analysis using SheetJS.
- **styles.css** — Space-themed UI styling.
- **lib-init.js** — Ensures third-party libraries (especially docx) are available on `window` with graceful fallbacks.

### State Management

Background persistent state (synced to `chrome.storage.local`):
```
{ isInitialized, lastActiveTime, sessionData, userSettings, operationHistory[] }
```

Side panel local state (restored on panel open):
```
{ currentTab, lastInputs, lastResults, modelSettings, operationHistory[] }
```

API keys and model configs stored under `chrome.storage.local` key `modelConfigs`. Model migration from legacy `apiKeys` format is handled automatically in `DeepSeekAPI`.

### Third-Party Libraries (lib/)

All vendored and minified: `docx.min.js` (Word generation), `marked.min.js` (Markdown parsing), `xlsx.full.min.js` (Excel parsing), `chart.min.js` (charts), `FileSaver.min.js` (file downloads).

### Other Directories

- **vue/** — Legacy Vue 2.x components from a different project (patient registration system). Not actively loaded by the extension.
- **excel_analyzer/** — Unused FastAPI backend; Excel analysis is done client-side in `api-service.js`.
- **.specify/** — Specify.ai templates and project constitution.

## Key Conventions

- Manifest V3 compliance is mandatory: service workers only, no persistent background pages, CSP restricts to `'self'` + `'wasm-unsafe-eval'`.
- All LLM API calls must go through the `DeepSeekAPI` class — no parallel credential storage mechanisms.
- Features that can run locally (MD-to-Word, test data generation) must not make network calls.
- No inline scripts in extension pages (CSP enforced).
- Version in `manifest.json` is the single source of truth; bump it (semver) before packaging user-facing changes.

## Active Technologies
- Vanilla JavaScript (ES2020+), Chrome Manifest V3 + Chrome Extensions API (sidePanel, tabs, storage, runtime), DeepSeekAPI (api-service.js), 飞书 Webhook API (001-page-summary-lark)
- `chrome.storage.local` (Webhook URL 配置持久化) (001-page-summary-lark)

## Recent Changes
- 001-page-summary-lark: Added Vanilla JavaScript (ES2020+), Chrome Manifest V3 + Chrome Extensions API (sidePanel, tabs, storage, runtime), DeepSeekAPI (api-service.js), 飞书 Webhook API
