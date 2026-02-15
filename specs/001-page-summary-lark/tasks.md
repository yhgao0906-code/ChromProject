# Tasks: 页面总结发送飞书

**Input**: Design documents from `/specs/001-page-summary-lark/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lark-webhook.md, quickstart.md

**Tests**: No automated tests (project uses manual browser verification only).

**Organization**: Tasks are grouped by user story. US2 (Webhook Config) is foundational and must complete before US1 (Core Feature) can be fully tested.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Prepare the codebase for the new feature. No new files needed — all changes go into existing files.

- [x] T001 Bump version from `1.8.0` to `1.9.0` in `manifest.json` (line 4, version field only)

**Checkpoint**: Version updated, extension still loads correctly after reload.

---

## Phase 2: User Story 2 - 配置飞书 Webhook 地址 (Priority: P1) — Foundational

**Goal**: Users can configure and persist a Lark Webhook URL in the extension settings panel.

**Independent Test**: Open settings panel → enter Webhook URL → save → close/reopen side panel → verify URL is still there. Enter invalid URL → verify error message shown.

**⚠️ CRITICAL**: US1 depends on this phase. Complete US2 before testing US1 end-to-end.

### Implementation for User Story 2

- [x] T002 [P] [US2] Add Webhook URL input field to settings panel in `sidepanel.html`: insert a new `<div class="setting-group">` block after the existing API key settings section (around line 430, before `<div class="settings-actions">`), containing a `<label>` "飞书 Webhook 地址" and an `<input id="larkWebhookInput" type="text" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/...">`
- [x] T003 [P] [US2] Add Webhook URL validation function in `sidepanel.js`: create a `validateLarkWebhookUrl(url)` function that tests against regex `/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[a-zA-Z0-9-]+$/` and returns `{valid: boolean, message: string}`
- [x] T004 [US2] Integrate Webhook URL save into existing save-settings handler in `sidepanel.js`: in the `saveSettingsButton` click handler (around line 935), read `larkWebhookInput.value`, validate with `validateLarkWebhookUrl()`, if valid call `chrome.storage.local.set({larkWebhookUrl: url})`, if invalid call `showError()` with validation message
- [x] T005 [US2] Load saved Webhook URL on settings panel open in `sidepanel.js`: in the `settingsButton` click handler (around line 898), add `chrome.storage.local.get(['larkWebhookUrl'], (result) => { if (result.larkWebhookUrl) larkWebhookInput.value = result.larkWebhookUrl; })` to restore the saved value

**Checkpoint**: Webhook URL can be saved, validated, persisted, and restored across sessions. Invalid URLs show error messages.

---

## Phase 3: User Story 1 - 一键总结当前页面并发送到飞书群 (Priority: P1) 🎯 MVP

**Goal**: One-click button that extracts page content, generates AI summary, and sends a Lark card message to the configured group chat.

**Independent Test**: Open any webpage → open side panel → switch to "飞书分享" tab → click "总结并发送" → verify Lark group chat receives a card with page title, summary, and "查看原文" link button.

### Implementation for User Story 1

- [x] T006 [P] [US1] Add "飞书分享" tab button to the tab bar in `sidepanel.html`: insert `<button class="tab-button" data-tab="lark-tab">飞书分享</button>` into the `.tabs` container (after the last tab button, around line 56)
- [x] T007 [P] [US1] Add "飞书分享" tab content section in `sidepanel.html`: insert a new `<div id="lark-tab" class="tab-content">` block (after the last tab content section, before the footer). Include: a result display area `<div id="larkResult"><span class="result-placeholder">点击按钮总结当前页面并发送到飞书群...</span></div>`, the action button `<button id="larkShareButton" class="action-button">总结并发送</button>`, and an execution time display `<div id="larkExecutionTime" class="execution-time"></div>`
- [x] T008 [P] [US1] Implement `buildLarkCardMessage(pageTitle, pageUrl, summaryContent)` function in `sidepanel.js`: builds the interactive card JSON per `contracts/lark-webhook.md` — returns `{msg_type: "interactive", card: {config: {wide_screen_mode: true}, header: {title: {tag: "plain_text", content: "📄 页面总结分享"}, template: "blue"}, elements: [markdown element with title + summary, action element with "查看原文" button linking to pageUrl]}}`
- [x] T009 [P] [US1] Implement `sendToLark(webhookUrl, cardMessage)` async function in `sidepanel.js`: performs `fetch(webhookUrl, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(cardMessage)})`, parses response JSON, checks `StatusCode === 0` for success, throws descriptive error for known error codes (19001, 19002, 19021, 9499 per contracts/lark-webhook.md), handles network errors with user-friendly messages
- [x] T010 [US1] Implement lark-share button click handler in `sidepanel.js`: wire `larkShareButton` click event with the full one-click flow: (1) check `larkWebhookUrl` from `chrome.storage.local` — if missing, call `showError('请先在设置中配置飞书 Webhook 地址')` and return; (2) set loading state via `setStatus('loading', '正在提取页面内容...')` and set `currentOperation = 'lark-share'`; (3) get active tab via `chrome.tabs.query({active: true, currentWindow: true})` and retrieve `tab.url` and `tab.title`; (4) send `{action: 'get_page_content'}` to content script via `chrome.tabs.sendMessage`; (5) on content received, validate bodyText length > 50 chars — if too short, show error "当前页面无可总结的文本内容"; (6) update status to '正在生成总结...', call `deepSeekAPI.summarizeText(pageContent)`; (7) update status to '正在发送到飞书...', call `buildLarkCardMessage()` then `sendToLark()`; (8) on success, display "发送成功" in `larkResult` with execution time in `larkExecutionTime`; (9) on any error, call `showError()` with specific error message; (10) support cancellation via existing `AbortController` pattern
- [x] T011 [US1] Add `lark-tab` state management in `sidepanel.js`: register DOM elements (`larkShareButton`, `larkResult`, `larkExecutionTime`) in `initializeComponents()`, add `lark-tab` to the `localState.currentTab` tracking, and initialize execution time display as hidden on startup (follow existing pattern for `jsonExecutionTime`, `translateExecutionTime`, etc.)
- [x] T012 [US1] Handle the content script response for lark-share in `sidepanel.js`: in the existing `chrome.runtime.onMessage` listener that handles `action: 'update_text'` with `target: 'summarize'`, add a parallel branch for `target: 'lark-share'` (or reuse the existing `get_page_content` response flow) to feed page content into the lark-share handler. Alternatively, use the callback-based approach from `chrome.tabs.sendMessage` directly in the button handler if the content script responds synchronously via `sendResponse`.

**Checkpoint**: Full end-to-end flow works: click "总结并发送" → page content extracted → AI summary generated → Lark card sent → success displayed. Error cases show appropriate messages.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, styling, and final verification.

- [x] T013 [P] Add styles for lark-tab elements in `styles.css` if the existing `.tab-content`, `.action-button`, `.result-area`, and `.execution-time` styles do not adequately cover the new tab (inspect visually — only add styles if needed, follow existing space-themed patterns)
- [x] T014 [P] Add edge case handling in lark-share button handler in `sidepanel.js`: ensure that when user clicks "总结并发送" during an ongoing operation, the button is disabled; ensure tab switching during operation does not interrupt the flow (page content and URL are captured at operation start, not at send time)
- [ ] T015 Run `quickstart.md` verification checklist: manually test all 10 items in the Verification Checklist section of `specs/001-page-summary-lark/quickstart.md` in the browser

**Checkpoint**: All edge cases handled, visual styling consistent, quickstart checklist passes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US2 - Webhook Config (Phase 2)**: Depends on Phase 1 — BLOCKS US1 end-to-end testing
- **US1 - Core Feature (Phase 3)**: Depends on Phase 1. HTML tasks (T006, T007) can start in parallel with Phase 2. JS logic tasks (T008, T009) can start in parallel with Phase 2. But the button handler (T010) needs T002-T005 complete to test the Webhook check.
- **Polish (Phase 4)**: Depends on Phase 2 and Phase 3 completion

### User Story Dependencies

- **US2 (Webhook Config)**: Can start after Setup — no dependency on US1
- **US1 (Core Feature)**: HTML/JS helper functions can be developed in parallel with US2. Full integration testing requires US2 complete.

### Within Each User Story

- US2: T002 and T003 are parallel (different files). T004 depends on T002 (input element) and T003 (validation function). T005 depends on T002 (input element).
- US1: T006, T007, T008, T009 are all parallel (different concerns/files). T010 depends on T006+T007 (DOM elements), T008+T009 (helper functions), and T002-T005 (Webhook config available). T011 depends on T006+T007. T012 depends on T010 (handler context).

### Parallel Opportunities

Within Phase 2 (US2):
```
Parallel: T002 (HTML) + T003 (JS validation)
Then: T004 (save handler) + T005 (load handler) — can run in parallel after T002+T003
```

Within Phase 3 (US1):
```
Parallel: T006 (tab button HTML) + T007 (tab content HTML) + T008 (card builder JS) + T009 (send function JS)
Then: T010 (button handler — depends on all above + US2)
Then: T011 (state management) + T012 (content response handling)
```

Cross-phase parallelism:
```
Phase 2 tasks can run in parallel with US1 HTML tasks (T006, T007) and JS helper tasks (T008, T009)
```

---

## Parallel Example: Phase 2 + Phase 3 Early Tasks

```text
# Can run simultaneously (different files, no dependencies):
T002: Add Webhook input to settings panel in sidepanel.html
T003: Add Webhook validation function in sidepanel.js
T006: Add "飞书分享" tab button in sidepanel.html
T007: Add "飞书分享" tab content in sidepanel.html
T008: Implement buildLarkCardMessage() in sidepanel.js
T009: Implement sendToLark() in sidepanel.js

# After above complete:
T004: Integrate Webhook save logic in sidepanel.js
T005: Load Webhook URL on settings open in sidepanel.js
T010: Implement lark-share button handler in sidepanel.js
T011: Add lark-tab state management in sidepanel.js
T012: Handle content script response in sidepanel.js
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 1: Version bump (T001)
2. Complete Phase 2: Webhook config (T002-T005) — prerequisite
3. Complete Phase 3: Core feature (T006-T012)
4. **STOP and VALIDATE**: Test end-to-end with a real Lark group chat
5. Complete Phase 4: Polish if needed (T013-T015)

### Incremental Delivery

1. T001 → Version bumped
2. T002-T005 → Webhook config working → Can verify settings persistence
3. T006-T012 → Full feature working → Can verify Lark message delivery
4. T013-T015 → Edge cases and visual polish → Production ready

---

## Notes

- [P] tasks = different files or independent concerns, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests — project uses manual browser verification
- All changes go into existing files (no new files created)
- Reload extension at `chrome://extensions/` after modifying `manifest.json`
- Close/reopen side panel after modifying `sidepanel.js`, `sidepanel.html`, or `styles.css`
- The content script response flow for page content extraction may need adjustment — existing flow sends results via `chrome.runtime.sendMessage` to background then to sidepanel; the lark-share handler should align with this pattern
